import { MarketRateRepository } from "./market-rate.repository";
import { MarketRateFilter, AgmarknetPriceRecord, PriceDirection, DemandLevel } from "./market-rate.types";
import axios from "axios";
import { PrismaClient, ExternalSyncType, ExternalSyncStatusType } from "@prisma/client";
import { logger } from "../../../utils/logger";
import { getRedisClient } from "../../../config/redis";

const repository = new MarketRateRepository();
const prisma = new PrismaClient();

export class MarketRateService {
  constructor() {
    // Zero constructor side effects: pure dependency/instance holder
  }

  async getAllRates(filters: MarketRateFilter) {
    const redis = getRedisClient();
    let rates: any[] = [];

    if (redis) {
      try {
        const cached = await redis.get("MARKET_RATES:LATEST").catch(() => null);
        if (cached) {
          rates = (typeof cached === "string" ? JSON.parse(cached) : cached) as any[];
          logger.debug({ message: "Serving market rates from Redis cache", key: "MARKET_RATES:LATEST" });
        }
      } catch (err: any) {
        logger.warn({ message: "Failed reading market rates from Redis cache", error: err.message });
      }
    }

    if (!rates || rates.length === 0) {
      rates = await repository.findAll({});
      if (redis && rates.length > 0) {
        try {
          await redis.set("MARKET_RATES:LATEST", JSON.stringify(rates), { ex: 6 * 60 * 60 }).catch(() => {});
        } catch (err: any) {
          logger.warn({ message: "Failed writing market rates to Redis cache", error: err.message });
        }
      }
    }

    // Apply filters in-memory if loaded from cache or if query was requested
    if (filters.commodity || filters.state || filters.district || filters.mandi) {
      const c = filters.commodity?.toLowerCase();
      const s = filters.state?.toLowerCase();
      const d = filters.district?.toLowerCase();
      const m = filters.mandi?.toLowerCase();

      rates = rates.filter(r => {
        if (c && !r.commodity?.toLowerCase().includes(c)) return false;
        if (s && !r.state?.toLowerCase().includes(s)) return false;
        if (d && !r.district?.toLowerCase().includes(d)) return false;
        if (m && !r.mandiName?.toLowerCase().includes(m)) return false;
        return true;
      });
    }

    return rates;
  }

  async getTrending() {
    return repository.findTrending();
  }

  async getGainers() {
    return repository.findGainers();
  }

  async getLosers() {
    return repository.findLosers();
  }

  async getNearby(state: string, district?: string) {
    return repository.findNearby(state, district);
  }

  /**
   * Sync data from Data.gov.in (Agmarknet)
   * Decoupled from live reads. Fully protected via distributed lock and circuit breaker.
   */
  async syncMarketRates(isManualTrigger = false): Promise<{ success: boolean; message: string; recordsProcessed?: number }> {
    const startTime = Date.now();
    logger.info(`🔄 Starting Production Market Rates Sync (isManualTrigger=${isManualTrigger})...`);

    const redis = getRedisClient();
    const lockKey = "LOCK:MARKET_RATE_SYNC";
    const backoffKey = "MARKET_API_BACKOFF_UNTIL";

    // 1. Check Circuit Breaker
    if (redis) {
      try {
        const backoffVal = await redis.get(backoffKey).catch(() => null);
        if (backoffVal) {
          const backoffTime = parseInt(backoffVal as string, 10);
          if (Date.now() < backoffTime) {
            const warningMsg = `Market rates sync aborted: API backoff circuit breaker active until ${new Date(backoffTime).toISOString()}`;
            logger.warn({ message: warningMsg });
            return { success: false, message: "Sync skipped: API backoff active." };
          }
        }
      } catch (err: any) {
        logger.warn({ message: "Failed reading Redis backoff key", error: err.message });
      }

      // 2. Try to acquire Distributed Lock
      try {
        const lockAcquired = await redis.set(lockKey, "locked", { nx: true, ex: 600 }).catch(() => null);
        if (!lockAcquired) {
          const lockedMsg = "Market rates sync skipped: Sync already in progress (lock exists).";
          logger.warn({ message: lockedMsg });
          return { success: false, message: "Market sync already in progress." };
        }
      } catch (err: any) {
        logger.warn({ message: "Failed acquiring Redis distributed lock", error: err.message });
      }
    }

    // Update sync status to RUNNING in the DB
    await prisma.externalSyncStatus.upsert({
      where: { syncType: ExternalSyncType.MARKET_RATES },
      create: {
        syncType: ExternalSyncType.MARKET_RATES,
        status: ExternalSyncStatusType.RUNNING,
        lastAttemptAt: new Date(),
        isManualTrigger,
        source: "Agmarknet",
      },
      update: {
        status: ExternalSyncStatusType.RUNNING,
        lastAttemptAt: new Date(),
        isManualTrigger,
      }
    }).catch((err) => logger.warn({ message: "Failed writing RUNNING status to DB", error: err.message }));

    const apiKey = process.env.DATA_GOV_API_KEY;
    if (!apiKey) {
      logger.warn({ message: "DATA_GOV_API_KEY missing. Sync aborted." });
      if (redis) await redis.del(lockKey).catch(() => {});
      return { success: false, message: "DATA_GOV_API_KEY missing." };
    }

    const resourceId = "9ef84268-d588-465a-a308-a864a43d0070";
    // Limit data fetch size and only fetch relevant state (Maharashtra) to avoid large payloads
    const url = `https://api.data.gov.in/resource/${resourceId}?api-key=${apiKey}&format=json&limit=50&filters[state]=Maharashtra`;

    try {
      // 3. Fetch with Retry Throttling
      const response = await this.fetchWithRetry(url);
      const records: AgmarknetPriceRecord[] = response.data.records ?? [];

      // 4. Process records into PostgreSQL
      for (const record of records) {
        await this.processRecord(record);
      }

      // 5. Update Read optimization Cache in Redis
      const allLatestRates = await repository.findAll({});
      if (redis && allLatestRates.length > 0) {
        await redis.set("MARKET_RATES:LATEST", JSON.stringify(allLatestRates), { ex: 6 * 60 * 60 }).catch(() => {});
      }

      // 6. Record success in ExternalSyncStatus model
      const durationMs = Date.now() - startTime;
      await prisma.externalSyncStatus.upsert({
        where: { syncType: ExternalSyncType.MARKET_RATES },
        create: {
          syncType: ExternalSyncType.MARKET_RATES,
          status: ExternalSyncStatusType.SUCCESS,
          recordsProcessed: records.length,
          durationMs,
          lastSuccessAt: new Date(),
          source: "Agmarknet",
          isManualTrigger,
        },
        update: {
          status: ExternalSyncStatusType.SUCCESS,
          recordsProcessed: records.length,
          durationMs,
          lastSuccessAt: new Date(),
          errorMessage: null,
          isManualTrigger,
        }
      }).catch((dbErr) => logger.warn({ message: "Failed auditing sync status to DB", error: dbErr.message }));

      logger.info({ message: "✅ Market Rates Sync Complete.", recordsProcessed: records.length, durationMs });

      // 7. Clean up Lock
      if (redis) await redis.del(lockKey).catch(() => {});

      return { success: true, message: "Market rates sync completed successfully.", recordsProcessed: records.length };
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      const status = error.response?.status;

      // Clean up Lock
      if (redis) await redis.del(lockKey).catch(() => {});

      // 8. Circuit Breaker trigger on 429
      if (status === 429) {
        logger.warn({
          message: "Data.gov.in API rate limit reached (429). Sync aborted.",
          status: 429,
          endpoint: url
        });

        if (redis) {
          // Set 2 hours backoff until next attempt
          const backoffDuration = 2 * 60 * 60 * 1000;
          await redis.set(backoffKey, (Date.now() + backoffDuration).toString(), { ex: 2 * 60 * 60 }).catch(() => {});
        }

        await prisma.externalSyncStatus.upsert({
          where: { syncType: ExternalSyncType.MARKET_RATES },
          create: {
            syncType: ExternalSyncType.MARKET_RATES,
            status: ExternalSyncStatusType.FAILED,
            durationMs,
            lastFailureAt: new Date(),
            errorMessage: "429 Too Many Requests (Rate limit reached)",
            source: "Agmarknet",
            isManualTrigger,
          },
          update: {
            status: ExternalSyncStatusType.FAILED,
            durationMs,
            lastFailureAt: new Date(),
            errorMessage: "429 Too Many Requests (Rate limit reached)",
            isManualTrigger,
          }
        }).catch(() => {});

        return { success: false, message: "Data.gov.in API rate limit reached. Backoff activated." };
      }

      // 9. Structured Sanitized Error Logging for other errors (no full Axios objects)
      logger.error({
        message: "Market rates sync failed",
        error: error.message,
        status: status,
        endpoint: url
      });

      await prisma.externalSyncStatus.upsert({
        where: { syncType: ExternalSyncType.MARKET_RATES },
        create: {
          syncType: ExternalSyncType.MARKET_RATES,
          status: ExternalSyncStatusType.FAILED,
          durationMs,
          lastFailureAt: new Date(),
          errorMessage: error.message,
          source: "Agmarknet",
          isManualTrigger,
        },
        update: {
          status: ExternalSyncStatusType.FAILED,
          durationMs,
          lastFailureAt: new Date(),
          errorMessage: error.message,
          isManualTrigger,
        }
      }).catch(() => {});

      return { success: false, message: error.message };
    }
  }

  /**
   * Request delay and exponential backoff retry helper. Short-circuits on 429.
   */
  private async fetchWithRetry(url: string, retries = 2, delayMs = 10000): Promise<any> {
    try {
      return await axios.get(url);
    } catch (error: any) {
      const status = error.response?.status;
      if (status === 429) {
        throw error; // Do not retry 429 at all!
      }
      if (retries > 0) {
        logger.warn({
          message: "External Mandi API call failed. Retrying...",
          retriesLeft: retries,
          delayMs,
          error: error.message,
          endpoint: url
        });
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.fetchWithRetry(url, retries - 1, delayMs * 2);
      }
      throw error;
    }
  }

  private async processRecord(record: AgmarknetPriceRecord) {
    const modalPrice = typeof record.modal_price === 'string' ? parseFloat(record.modal_price) : record.modal_price;
    
    // Robust date parsing for DD/MM/YYYY
    let recordedDate: Date;
    if (typeof record.arrival_date === 'string' && record.arrival_date.includes('/')) {
      const [day, month, year] = record.arrival_date.split('/').map(Number);
      recordedDate = new Date(year, month - 1, day);
    } else {
      recordedDate = new Date(record.arrival_date);
    }

    if (isNaN(recordedDate.getTime())) {
      logger.warn({ message: `Invalid date format: ${record.arrival_date}. Skipping record.` });
      return;
    }

    // Normalize crop names (Tomato, Onion, etc.)
    const normalizedCommodity = this.normalizeText(record.commodity);

    // Get previous modal price to calculate trend
    const previous = await repository.getLatestForMandi(normalizedCommodity, record.market);
    
    let trendPercent = 0;
    let priceDirection: PriceDirection = PriceDirection.STABLE;

    if (previous && previous.modalPrice > 0) {
      trendPercent = ((modalPrice - previous.modalPrice) / previous.modalPrice) * 100;
      priceDirection = modalPrice > previous.modalPrice 
        ? PriceDirection.UP 
        : modalPrice < previous.modalPrice 
          ? PriceDirection.DOWN 
          : PriceDirection.STABLE;
    }

    // Determine demand level based on trend and price direction
    const demandLevel = trendPercent > 5 ? DemandLevel.HIGH : trendPercent < -5 ? DemandLevel.LOW : DemandLevel.MEDIUM;

    await repository.upsertRate({
      commodity: normalizedCommodity,
      variety: record.variety,
      grade: record.grade,
      mandiName: record.market,
      district: record.district,
      state: record.state,
      minPrice: typeof record.min_price === 'string' ? parseFloat(record.min_price) : record.min_price,
      maxPrice: typeof record.max_price === 'string' ? parseFloat(record.max_price) : record.max_price,
      modalPrice: modalPrice,
      unit: "Quintal",
      previousPrice: previous?.modalPrice ?? modalPrice,
      trendPercent: parseFloat(trendPercent.toFixed(2)),
      priceDirection: priceDirection,
      demandLevel: demandLevel,
      source: "Agmarknet",
      recordedDate: recordedDate,
      syncedAt: new Date(),
    });
  }

  private normalizeText(text: string): string {
    return text.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ').trim();
  }
}

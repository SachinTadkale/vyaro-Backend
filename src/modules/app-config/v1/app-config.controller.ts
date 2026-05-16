import { Request, Response } from "express";
import { getRedisClient } from "../../../config/redis";
import { systemSettingsService } from "../../system-settings/v1/system-setting.service";
import { SystemSettingKey } from "../../system-settings/v1/system-setting.types";
import { logger } from "../../../utils/logger";

// ── Cache Configurations ──────────────────────────────────────────────────
const SNAPSHOT_VERSION = 1;
const SNAPSHOT_REDIS_KEY = "APP_CONFIG:SNAPSHOT:v1";
const REBUILD_LOCK_KEY = "LOCK:APP_CONFIG_REBUILD";
const MEMORY_CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes

// ── Shared Memory States ──────────────────────────────────────────────────
let localAppConfigCache: any = null;
let localAppConfigCacheExpiresAt = 0;
let lastRebuildTimestamp = "";
let isRebuilding = false;
let debounceTimeout: NodeJS.Timeout | null = null;

/** Shape of the /app-config features */
interface FeatureConfig {
  enabled: boolean;
  visible: boolean;
}

interface AppConfigResponse {
  version:         number;
  generatedAt:     string;
  maintenanceMode: boolean;
  readOnlyMode:    boolean;
  features: {
    marketplace:  FeatureConfig;
    orders:       FeatureConfig;
    payments:     FeatureConfig;
    delivery:     FeatureConfig;
    marketRates:  FeatureConfig;
    ai:           FeatureConfig;
    news:         FeatureConfig;
    qr:           FeatureConfig;
    myCrops:      FeatureConfig;
  };
}

/**
 * GET /api/v1/app-config
 *
 * Public remote-configuration endpoint.
 * Serves dynamic system settings and feature toggles in sub-milliseconds.
 */
export const getAppConfig = async (_req: Request, res: Response) => {
  try {
    const now = Date.now();

    // 1. First Layer: Ultra-fast Memory Cache (takes <1ms)
    if (localAppConfigCache && now < localAppConfigCacheExpiresAt) {
      return res.json({
        success: true,
        data: localAppConfigCache,
        _source: "memory",
      });
    }

    // 2. Second Layer: Redis Cache Fallback (takes <5ms)
    const redis = getRedisClient();
    if (redis) {
      try {
        const cached = await redis.get(SNAPSHOT_REDIS_KEY).catch(() => null);
        if (cached) {
          const parsed = (typeof cached === "string" ? JSON.parse(cached) : cached) as AppConfigResponse;
          
          // Hydrate memory cache safely using frozen deep clones to prevent mutations
          localAppConfigCache = Object.freeze(structuredClone(parsed));
          localAppConfigCacheExpiresAt = Date.now() + MEMORY_CACHE_TTL_MS;

          logger.info({ message: "App Config cache hit from Redis snapshot", key: SNAPSHOT_REDIS_KEY });
          return res.json({
            success: true,
            data: localAppConfigCache,
            _source: "redis",
          });
        }
      } catch (err: any) {
        logger.warn({ message: "Redis read failed in app-config, falling back to database fetch", error: err.message });
      }
    }

    logger.info("App Config cache miss - loading from database snapshot rebuild");

    // 3. Third Layer: Fallback Database Precomputation
    const config = await precomputeAppConfigSnapshot();
    if (config) {
      return res.json({
        success: true,
        data: config,
        _source: "db",
      });
    }

    // 4. Absolute Final Safe-Defaults Fallback (Prevents breaking the client if DB/Redis fail concurrently)
    const fallback = buildFallbackConfig();
    return res.json({
      success: true,
      data: fallback,
      _source: "fallback",
    });
  } catch (error: any) {
    logger.error({ message: "Critical failure in getAppConfig route handler", error: error.message });
    res.status(200).json({
      success: true,
      data: buildFallbackConfig(),
      _source: "fallback_err",
    });
  }
};

/**
 * GET /api/v1/admin/runtime-health
 *
 * Operational health dashboard endpoint. Exposes metadata regarding caches and replication status.
 */
export const getRuntimeHealth = async (_req: Request, res: Response) => {
  const redis = getRedisClient();
  const redisConnected = Boolean(redis);
  
  const now = Date.now();
  const memoryCacheSet = Boolean(localAppConfigCache);
  const memoryCacheExpired = now >= localAppConfigCacheExpiresAt;
  const memoryCacheState = !memoryCacheSet 
    ? "empty" 
    : memoryCacheExpired 
      ? "expired" 
      : "active";

  const timeRemainingSeconds = memoryCacheSet && !memoryCacheExpired
    ? Math.max(0, Math.round((localAppConfigCacheExpiresAt - now) / 1000))
    : 0;

  return res.status(200).json({
    success: true,
    data: {
      snapshotVersion: SNAPSHOT_VERSION,
      generatedAt: localAppConfigCache?.generatedAt || null,
      lastRebuildTimestamp,
      redisConnected,
      redisSnapshotKey: SNAPSHOT_REDIS_KEY,
      memoryCacheState,
      memoryCacheTtlSeconds: MEMORY_CACHE_TTL_MS / 1000,
      memoryCacheRemainingSeconds: timeRemainingSeconds,
      hasRebuildInProgress: isRebuilding,
    }
  });
};

/**
 * Precompute the full remote config snapshot.
 * Protected by cross-instance distributed rebuild locks and local single-flight locks.
 */
export const precomputeAppConfigSnapshot = async (): Promise<AppConfigResponse | null> => {
  // Local single-flight lock
  if (isRebuilding) {
    logger.debug("Snapshot precomputation skipped: local single-flight rebuild already in progress");
    return null;
  }

  const redis = getRedisClient();
  let acquiredLock = false;

  try {
    isRebuilding = true;

    // Cross-instance distributed single-flight lock
    if (redis) {
      const lock = await redis.set(REBUILD_LOCK_KEY, "locked", { nx: true, ex: 15 }).catch(() => null);
      if (!lock) {
        logger.debug("Snapshot precomputation skipped: concurrent distributed rebuild in progress");
        return null;
      }
      acquiredLock = true;
    }

    logger.info("🔄 Precomputing dynamic App Config snapshot...");

    const [
      maintenanceMode,
      readOnlyMode,

      enableMarketplace, visibleMarketplace,
      enableOrders,      visibleOrders,
      enablePayments,
      enableDelivery,    visibleDelivery,
      enableMarketRates, visibleMarketRates,
      enableAI,          visibleAI,
      enableNews,        visibleNews,
      enableQR,          visibleQR,
      enableMyCrops,     visibleMyCrops,
    ] = await Promise.all([
      systemSettingsService.getBoolean(SystemSettingKey.MAINTENANCE_MODE, false),
      systemSettingsService.getBoolean(SystemSettingKey.READ_ONLY_MODE,   false),

      systemSettingsService.getBoolean(SystemSettingKey.ENABLE_MARKETPLACE,   true),
      systemSettingsService.getBoolean(SystemSettingKey.VISIBLE_MARKETPLACE,  true),
      systemSettingsService.getBoolean(SystemSettingKey.ENABLE_ORDERS,        true),
      systemSettingsService.getBoolean(SystemSettingKey.VISIBLE_ORDERS,       true),
      systemSettingsService.getBoolean(SystemSettingKey.ENABLE_PAYMENTS,      true),
      systemSettingsService.getBoolean(SystemSettingKey.ENABLE_DELIVERY,      true),
      systemSettingsService.getBoolean(SystemSettingKey.VISIBLE_DELIVERY,     true),
      systemSettingsService.getBoolean(SystemSettingKey.ENABLE_MARKET_RATES,  true),
      systemSettingsService.getBoolean(SystemSettingKey.VISIBLE_MARKET_RATES, true),
      systemSettingsService.getBoolean(SystemSettingKey.ENABLE_AI,            false),
      systemSettingsService.getBoolean(SystemSettingKey.VISIBLE_AI,           true),
      systemSettingsService.getBoolean(SystemSettingKey.ENABLE_NEWS,          false),
      systemSettingsService.getBoolean(SystemSettingKey.VISIBLE_NEWS,         true),
      systemSettingsService.getBoolean(SystemSettingKey.ENABLE_QR,            false),
      systemSettingsService.getBoolean(SystemSettingKey.VISIBLE_QR,           false),
      systemSettingsService.getBoolean(SystemSettingKey.ENABLE_MY_CROPS,       true),
      systemSettingsService.getBoolean(SystemSettingKey.VISIBLE_MY_CROPS,      true),
    ]);

    const config: AppConfigResponse = {
      version: SNAPSHOT_VERSION,
      generatedAt: new Date().toISOString(),
      maintenanceMode,
      readOnlyMode,
      features: {
        marketplace: { enabled: enableMarketplace, visible: visibleMarketplace },
        orders:      { enabled: enableOrders,      visible: visibleOrders      },
        payments:    { enabled: enablePayments,    visible: true               },
        delivery:    { enabled: enableDelivery,    visible: visibleDelivery    },
        marketRates: { enabled: enableMarketRates, visible: visibleMarketRates },
        ai:          { enabled: enableAI,          visible: visibleAI          },
        news:        { enabled: enableNews,        visible: visibleNews        },
        qr:          { enabled: enableQR,          visible: visibleQR          },
        myCrops:     { enabled: enableMyCrops,     visible: visibleMyCrops     },
      },
    };

    // Save to Redis key permanently
    if (redis) {
      await redis.set(SNAPSHOT_REDIS_KEY, JSON.stringify(config)).catch((err) => {
        logger.warn({ message: "Failed writing App Config snapshot to Redis", error: err.message });
      });
    }

    // Freeze snapshot inside memory cache to protect from reference corruption
    localAppConfigCache = Object.freeze(structuredClone(config));
    localAppConfigCacheExpiresAt = Date.now() + MEMORY_CACHE_TTL_MS;
    
    lastRebuildTimestamp = new Date().toISOString();
    logger.info({ message: "✅ App Config snapshot regenerated and cached successfully", version: SNAPSHOT_VERSION });

    return config;
  } catch (error: any) {
    logger.error({ message: "❌ Failed to precompute app config snapshot", error: error.message });
    return null;
  } finally {
    isRebuilding = false;
    if (redis && acquiredLock) {
      await redis.del(REBUILD_LOCK_KEY).catch(() => {});
    }
  }
};

/**
 * Debounces snapshot rebuild calls.
 * Collapses rapid sequential triggers into a single precomputation run.
 */
export const debouncedPrecomputeAppConfigSnapshot = () => {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }
  debounceTimeout = setTimeout(async () => {
    try {
      await precomputeAppConfigSnapshot();
    } catch (err: any) {
      logger.error({ message: "Error running debounced app config rebuild", error: err.message });
    }
  }, 250); // 250ms debounce window
};

/** Safe fallback defaults used when database/Redis connectivity is fully broken */
function buildFallbackConfig(): AppConfigResponse {
  return {
    version: SNAPSHOT_VERSION,
    generatedAt: new Date().toISOString(),
    maintenanceMode: false,
    readOnlyMode:    false,
    features: {
      marketplace: { enabled: true,  visible: true  },
      orders:      { enabled: true,  visible: true  },
      payments:    { enabled: true,  visible: true  },
      delivery:    { enabled: true,  visible: true  },
      marketRates: { enabled: true,  visible: true  },
      ai:          { enabled: false, visible: true  },
      news:        { enabled: false, visible: true  },
      qr:          { enabled: false, visible: false },
      myCrops:     { enabled: true,  visible: true  },
    },
  };
}

// Bind active callback so setting/route updates instantly rebuild memory and Redis cache
systemSettingsService.registerOnChange(async () => {
  logger.info("System setting or route toggle modified. Triggering debounced precomputed snapshot rebuild...");
  debouncedPrecomputeAppConfigSnapshot();
});

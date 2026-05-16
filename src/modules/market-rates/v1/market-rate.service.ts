import { MarketRateRepository } from "./market-rate.repository";
import { MarketRateFilter, AgmarknetPriceRecord, PriceDirection, DemandLevel } from "./market-rate.types";
import axios from "axios";
import { PrismaClient } from "@prisma/client";

const repository = new MarketRateRepository();
const prisma = new PrismaClient();

export class MarketRateService {
  constructor() {
    this.initSync();
  }

  private async initSync() {
    console.log("🔄 Triggering Initial Market Rates Sync...");
    await this.syncMarketRates();
  }

  async getAllRates(filters: MarketRateFilter) {
    const officialRates = await repository.findAll(filters);
    
    // In hybrid model, we also include insights from internal FarmZY listings
    // const internalRates = await this.getInternalFarmZYRates(filters);
    
    return officialRates;
  }

  /**
   * Internal FarmZY Analytics Integration
   * Calculates average prices from active marketplace listings
   */
  private async getInternalFarmZYRates(filters: MarketRateFilter) {
    // Group listings by product/commodity
    const listings = await prisma.marketListing.findMany({
      where: {
        status: "ACTIVE",
        product: filters.commodity ? { productName: { contains: filters.commodity, mode: "insensitive" } } : undefined,
      },
      include: { product: true, seller: { include: { farmDetails: true } } },
    });

    const groups: Record<string, { total: number, count: number, state: string, district: string }> = {};

    for (const l of listings) {
      const name = l.product.productName;
      if (!groups[name]) groups[name] = { total: 0, count: 0, state: l.seller.farmDetails?.state ?? 'India', district: l.seller.farmDetails?.district ?? 'Local' };
      groups[name].total += l.price;
      groups[name].count += 1;
    }

    return Object.entries(groups).map(([name, data]) => ({
      id: `internal-${name}`,
      commodity: name,
      category: "FarmZY Intelligence",
      variety: "Platform Average",
      mandiName: "FarmZY Marketplace",
      district: data.district,
      state: data.state,
      modalPrice: data.total / data.count,
      unit: "Platform Unit",
      source: "FarmZY Internal",
      recordedDate: new Date(),
      syncedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      trendPercent: 0, // Could calculate this historically
      priceDirection: "STABLE",
      demandLevel: "MEDIUM"
    }));
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
   */
  async syncMarketRates() {
    console.log("🔄 Starting Production Market Rates Sync...");
    try {
      const apiKey = process.env.DATA_GOV_API_KEY;
      if (!apiKey) {
        console.warn("⚠️ DATA_GOV_API_KEY missing. Sync aborted.");
        // await this.mockSync();
        return;
      }

      const resourceId = "9ef84268-d588-465a-a308-a864a43d0070";
      const url = `https://api.data.gov.in/resource/${resourceId}?api-key=${apiKey}&format=json&limit=100`;

      const response = await axios.get(url);
      const records: AgmarknetPriceRecord[] = response.data.records;

      for (const record of records) {
        await this.processRecord(record);
      }

      console.log("✅ Market Rates Sync Complete.");
    } catch (error) {
      console.error("❌ Sync Failed:", error);
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
      console.warn(`⚠️ Invalid date format: ${record.arrival_date}. Skipping record.`);
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

  /**
   * Mock sync for development if no API key
   * Generates yesterday and today records to ensure trends exist
   */
  private async mockSync() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const today = new Date();

    const mockSets = [
      { 
        commodity: "TOMATO", 
        mandi: "Nashik Mandi", 
        yesterdayPrice: 3500, 
        todayPrice: 4000, // +14%
        state: "Maharashtra",
        district: "Nashik"
      },
      { 
        commodity: "ONION", 
        mandi: "Lasalgaon Mandi", 
        yesterdayPrice: 3200, 
        todayPrice: 2800, // -12.5%
        state: "Maharashtra",
        district: "Nashik"
      },
      { 
        commodity: "WHEAT", 
        mandi: "Pune Mandi", 
        yesterdayPrice: 2400, 
        todayPrice: 2600, // +8.3%
        state: "Maharashtra",
        district: "Pune"
      },
      { 
        commodity: "POTATO", 
        mandi: "Solapur Mandi", 
        yesterdayPrice: 2000, 
        todayPrice: 1900, // -5%
        state: "Maharashtra",
        district: "Solapur"
      }
    ];

    for (const set of mockSets) {
      // 1. Create Yesterday's Record
      await repository.upsertRate({
        commodity: this.normalizeText(set.commodity),
        variety: "Regular",
        mandiName: set.mandi,
        district: set.district,
        state: set.state,
        modalPrice: set.yesterdayPrice,
        minPrice: set.yesterdayPrice - 200,
        maxPrice: set.yesterdayPrice + 200,
        recordedDate: yesterday,
        source: "Agmarknet",
        unit: "Quintal"
      });

      // 2. Create Today's Record (processRecord will calculate trend automatically)
      await this.processRecord({
        state: set.state,
        district: set.district,
        market: set.mandi,
        commodity: set.commodity,
        variety: "Regular",
        grade: "FAQ",
        arrival_date: today.toISOString(),
        min_price: (set.todayPrice - 200).toString(),
        max_price: (set.todayPrice + 200).toString(),
        modal_price: set.todayPrice.toString()
      });
    }
  }
}

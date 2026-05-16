import { PrismaClient, MarketRate } from "@prisma/client";
import { MarketRateFilter } from "./market-rate.types";

const prisma = new PrismaClient();

export class MarketRateRepository {
  getPrismaClient() {
    return prisma;
  }

  async findAll(filters: MarketRateFilter): Promise<MarketRate[]> {
    return prisma.marketRate.findMany({
      where: {
        commodity: filters.commodity ? { contains: filters.commodity, mode: "insensitive" } : undefined,
        state: filters.state ? { contains: filters.state, mode: "insensitive" } : undefined,
        district: filters.district ? { contains: filters.district, mode: "insensitive" } : undefined,
        mandiName: filters.mandi ? { contains: filters.mandi, mode: "insensitive" } : undefined,
      },
      orderBy: { recordedDate: "desc" },
    });
  }

  async findTrending(): Promise<MarketRate[]> {
    return prisma.marketRate.findMany({
      where: { trendPercent: { not: null } },
      orderBy: { trendPercent: "desc" },
      take: 10,
    });
  }

  async findGainers(): Promise<MarketRate[]> {
    return prisma.marketRate.findMany({
      where: { trendPercent: { gt: 0 } },
      orderBy: { trendPercent: "desc" },
      take: 10,
    });
  }

  async findLosers(): Promise<MarketRate[]> {
    return prisma.marketRate.findMany({
      where: { trendPercent: { lt: 0 } },
      orderBy: { trendPercent: "asc" },
      take: 10,
    });
  }

  async findNearby(state: string, district?: string): Promise<MarketRate[]> {
    return prisma.marketRate.findMany({
      where: {
        state: { equals: state, mode: "insensitive" },
        district: district ? { equals: district, mode: "insensitive" } : undefined,
      },
      orderBy: { recordedDate: "desc" },
      take: 20,
    });
  }

  async upsertRate(data: any) {
    return prisma.marketRate.upsert({
      where: {
        commodity_mandiName_district_recordedDate: {
          commodity: data.commodity,
          mandiName: data.mandiName,
          district: data.district,
          recordedDate: data.recordedDate,
        },
      },
      update: data,
      create: data,
    });
  }

  async getLatestForMandi(commodity: string, mandiName: string) {
    return prisma.marketRate.findFirst({
      where: { commodity, mandiName },
      orderBy: { recordedDate: "desc" },
    });
  }
}

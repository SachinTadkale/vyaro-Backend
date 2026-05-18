/**
 * AI Analytics Service
 *
 * Owner-only analytics aggregations over AIUsageLog.
 * Provides token trends, cost estimates, model breakdowns,
 * top users, role distributions, and provider comparisons.
 */

import prisma from "../../../config/prisma";
import { UserRole, AiProvider, AIUsageStatus } from "@prisma/client";

export class AiAnalyticsService {
  /**
   * High-level token and cost summary across all users.
   */
  async getTokenSummary() {
    const agg = await prisma.aIUsageLog.aggregate({
      _sum: { totalTokens: true, promptTokens: true, completionTokens: true, estimatedCost: true },
      _avg: { latencyMs: true, totalTokens: true },
      _count: { id: true },
    });

    const successCount = await prisma.aIUsageLog.count({
      where: { status: AIUsageStatus.SUCCESS },
    });

    const failureCount = await prisma.aIUsageLog.count({
      where: { status: { in: [AIUsageStatus.FAILED, AIUsageStatus.BLOCKED, AIUsageStatus.QUOTA_EXCEEDED] } },
    });

    return {
      totalTokens: agg._sum.totalTokens ?? 0,
      promptTokens: agg._sum.promptTokens ?? 0,
      completionTokens: agg._sum.completionTokens ?? 0,
      totalCostUSD: agg._sum.estimatedCost ?? 0,
      avgLatencyMs: Math.round(agg._avg.latencyMs ?? 0),
      avgTokensPerRequest: Math.round(agg._avg.totalTokens ?? 0),
      totalRequests: agg._count.id,
      successRequests: successCount,
      failedRequests: failureCount,
      successRate: agg._count.id > 0
        ? Math.round((successCount / agg._count.id) * 100)
        : 0,
    };
  }

  /**
   * Token usage breakdown by role.
   */
  async getTokensByRole(): Promise<{ role: string; tokens: number; requests: number }[]> {
    const result = await prisma.aIUsageLog.groupBy({
      by: ["role"],
      _sum: { totalTokens: true },
      _count: { id: true },
      orderBy: { _sum: { totalTokens: "desc" } },
    });

    return result.map((r) => ({
      role: r.role,
      tokens: r._sum.totalTokens ?? 0,
      requests: r._count.id,
    }));
  }

  /**
   * Token usage breakdown by AI provider.
   */
  async getTokensByProvider(): Promise<{ provider: string; tokens: number; requests: number; cost: number }[]> {
    const result = await prisma.aIUsageLog.groupBy({
      by: ["provider"],
      _sum: { totalTokens: true, estimatedCost: true },
      _count: { id: true },
      orderBy: { _sum: { totalTokens: "desc" } },
    });

    return result.map((r) => ({
      provider: r.provider,
      tokens: r._sum.totalTokens ?? 0,
      requests: r._count.id,
      cost: r._sum.estimatedCost ?? 0,
    }));
  }

  /**
   * Token usage breakdown by model name.
   */
  async getTokensByModel(): Promise<{ model: string; tokens: number; requests: number }[]> {
    const result = await prisma.aIUsageLog.groupBy({
      by: ["modelName"],
      _sum: { totalTokens: true },
      _count: { id: true },
      orderBy: { _sum: { totalTokens: "desc" } },
      take: 15,
    });

    return result.map((r) => ({
      model: r.modelName,
      tokens: r._sum.totalTokens ?? 0,
      requests: r._count.id,
    }));
  }

  /**
   * Request count breakdown by status.
   */
  async getStatusBreakdown(): Promise<{ status: string; count: number }[]> {
    const result = await prisma.aIUsageLog.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    return result.map((r) => ({
      status: r.status,
      count: r._count.id,
    }));
  }

  /**
   * Daily token usage trend over the past N days.
   */
  async getDailyTrend(days = 30): Promise<{ date: string; tokens: number; requests: number }[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await prisma.aIUsageLog.findMany({
      where: { createdAt: { gte: since }, status: AIUsageStatus.SUCCESS },
      select: { createdAt: true, totalTokens: true },
      orderBy: { createdAt: "asc" },
    });

    // Group by date string
    const byDate: Record<string, { tokens: number; requests: number }> = {};
    for (const log of logs) {
      const key = log.createdAt.toISOString().split("T")[0];
      if (!byDate[key]) byDate[key] = { tokens: 0, requests: 0 };
      byDate[key].tokens += log.totalTokens;
      byDate[key].requests += 1;
    }

    return Object.entries(byDate)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Top N users by token consumption.
   */
  async getTopUsers(limit = 10): Promise<any[]> {
    const result = await prisma.aIUsageLog.groupBy({
      by: ["userId", "companyId"],
      _sum: { totalTokens: true, estimatedCost: true },
      _count: { id: true },
      orderBy: { _sum: { totalTokens: "desc" } },
      take: limit,
    });

    // Enrich with user and company names
    const userIds = result.map((r) => r.userId).filter((id): id is string => !!id);
    const companyIds = result.map((r) => r.companyId).filter((id): id is string => !!id);

    const [users, companies] = await Promise.all([
      prisma.user.findMany({
        where: { user_id: { in: userIds } },
        select: { user_id: true, name: true, role: true, email: true },
      }),
      prisma.company.findMany({
        where: { companyId: { in: companyIds } },
        select: { companyId: true, companyName: true, email: true },
      }),
    ]);

    const userMap = new Map(users.map((u) => [u.user_id, u]));
    const companyMap = new Map(companies.map((c) => [c.companyId, c]));

    return result.map((r) => {
      let displayName = "Saira System User";
      let email = "";
      let role = "USER";

      if (r.userId && userMap.has(r.userId)) {
        const u = userMap.get(r.userId)!;
        displayName = u.name;
        email = u.email || "";
        role = u.role;
      } else if (r.companyId && companyMap.has(r.companyId)) {
        const c = companyMap.get(r.companyId)!;
        displayName = c.companyName;
        email = c.email;
        role = "COMPANY";
      }

      return {
        userId: r.userId || r.companyId,
        displayName,
        email,
        role,
        totalTokens: r._sum.totalTokens ?? 0,
        totalCost: r._sum.estimatedCost ?? 0,
        totalRequests: r._count.id,
      };
    });
  }

  /**
   * Paginated raw AI usage logs with filters.
   */
  async getUsageLogs(filters?: {
    userId?: string;
    role?: UserRole;
    provider?: AiProvider;
    status?: AIUsageStatus;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page ?? 1;
    const limit = Math.min(filters?.limit ?? 50, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters?.userId) {
      where.OR = [
        { userId: filters.userId },
        { companyId: filters.userId }
      ];
    }
    if (filters?.role) where.role = filters.role;
    if (filters?.provider) where.provider = filters.provider;
    if (filters?.status) where.status = filters.status;
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    const [logs, total] = await Promise.all([
      prisma.aIUsageLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, role: true, email: true } },
          company: { select: { companyName: true, email: true } },
        },
      }),
      prisma.aIUsageLog.count({ where }),
    ]);

    return { logs, total, page, limit };
  }

  /**
   * Full governance analytics bundle — used by the dashboard overview tab.
   */
  async getFullAnalytics() {
    const [summary, byRole, byProvider, byModel, byStatus, trend, topUsers] =
      await Promise.all([
        this.getTokenSummary(),
        this.getTokensByRole(),
        this.getTokensByProvider(),
        this.getTokensByModel(),
        this.getStatusBreakdown(),
        this.getDailyTrend(30),
        this.getTopUsers(5),
      ]);

    return { summary, byRole, byProvider, byModel, byStatus, trend, topUsers };
  }
}

export const aiAnalyticsService = new AiAnalyticsService();

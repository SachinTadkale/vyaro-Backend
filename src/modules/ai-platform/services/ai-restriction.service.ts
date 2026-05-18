/**
 * AI Restriction Service
 *
 * Manages the full lifecycle of restriction codes and user-level AI restrictions.
 * Enforces strict RBAC hierarchy:
 *   OWNER  → can restrict any role
 *   ADMIN  → can restrict COMPANY, FARMER, DELIVERY_PARTNER only
 *   Others → cannot restrict anyone
 */

import prisma from "../../../config/prisma";
import { UserRole, RestrictionSeverity } from "@prisma/client";

// Roles that ADMIN is allowed to restrict
const ADMIN_CAN_RESTRICT: UserRole[] = [
  UserRole.COMPANY,
  UserRole.FARMER,
  UserRole.DELIVERY_PARTNER,
];

export class AiRestrictionService {
  // ─── Restriction Code Management ─────────────────────────────────────────

  async createRestrictionCode(data: {
    code: string;
    title: string;
    description: string;
    severity: RestrictionSeverity;
    httpStatus?: number;
    createdById: string;
  }) {
    return prisma.restrictionCode.create({
      data: {
        code: data.code.toUpperCase(),
        title: data.title,
        description: data.description,
        severity: data.severity,
        httpStatus: data.httpStatus ?? 403,
        createdById: data.createdById,
      },
    });
  }

  async listRestrictionCodes(filters?: {
    isActive?: boolean;
    severity?: RestrictionSeverity;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page ?? 1;
    const limit = Math.min(filters?.limit ?? 50, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.severity) where.severity = filters.severity;
    if (filters?.search) {
      where.OR = [
        { code: { contains: filters.search, mode: "insensitive" } },
        { title: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [codes, total] = await Promise.all([
      prisma.restrictionCode.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { name: true, role: true } },
          _count: { select: { restrictions: true } },
        },
      }),
      prisma.restrictionCode.count({ where }),
    ]);

    return { codes, total, page, limit };
  }

  async updateRestrictionCode(
    id: string,
    data: Partial<{
      title: string;
      description: string;
      severity: RestrictionSeverity;
      httpStatus: number;
      isActive: boolean;
    }>
  ) {
    return prisma.restrictionCode.update({ where: { id }, data });
  }

  // ─── User Restriction Management ─────────────────────────────────────────

  async restrictUser(params: {
    targetUserId: string;
    restrictionCodeId: string;
    imposedById: string;
    imposedByRole: UserRole;
    reason?: string;
    expiresAt?: Date;
  }) {
    const { targetUserId, imposedByRole, imposedById } = params;

    // Fetch target user's role for hierarchy validation
    const targetUser = await prisma.user.findUnique({
      where: { user_id: targetUserId },
      select: { role: true, name: true },
    });
    if (!targetUser) throw new Error("Target user not found.");

    // RBAC hierarchy check
    this.assertCanRestrict(imposedByRole, targetUser.role);

    // Check restriction code exists and is active
    const code = await prisma.restrictionCode.findUnique({
      where: { id: params.restrictionCodeId },
    });
    if (!code || !code.isActive) {
      throw new Error("Restriction code not found or inactive.");
    }

    return prisma.userAIRestriction.create({
      data: {
        userId: targetUserId,
        restrictionCodeId: params.restrictionCodeId,
        imposedById: imposedById,
        reason: params.reason,
        expiresAt: params.expiresAt,
        isActive: true,
      },
      include: {
        restrictionCode: true,
        user: { select: { name: true, role: true } },
        imposedBy: { select: { name: true, role: true } },
      },
    });
  }

  async removeRestriction(restrictionId: string, requesterId: string, requesterRole: UserRole) {
    const restriction = await prisma.userAIRestriction.findUnique({
      where: { id: restrictionId },
      include: { user: { select: { role: true } } },
    });
    if (!restriction) throw new Error("Restriction not found.");

    // RBAC: ensure requester has authority
    this.assertCanRestrict(requesterRole, restriction.user.role);

    return prisma.userAIRestriction.update({
      where: { id: restrictionId },
      data: { isActive: false },
    });
  }

  async listRestrictions(filters?: {
    userId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page ?? 1;
    const limit = Math.min(filters?.limit ?? 50, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    const [restrictions, total] = await Promise.all([
      prisma.userAIRestriction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, role: true, email: true } },
          imposedBy: { select: { name: true, role: true } },
          restrictionCode: true,
        },
      }),
      prisma.userAIRestriction.count({ where }),
    ]);

    return { restrictions, total, page, limit };
  }

  // ─── Quota Management ────────────────────────────────────────────────────

  async getUserQuota(userId: string) {
    const userQuota = await prisma.aIQuota.findUnique({ where: { userId } });
    if (userQuota) return userQuota;

    // Return role-level quota if no user override
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { role: true },
    });
    if (user) {
      return prisma.aIQuota.findFirst({ where: { role: user.role, userId: null } });
    }

    // Fallback to Company lookup
    const company = await prisma.company.findUnique({
      where: { companyId: userId },
      select: { companyId: true },
    });
    if (company) {
      return prisma.aIQuota.findFirst({ where: { role: "COMPANY", userId: null } });
    }

    return null;
  }

  async updateUserQuota(
    userId: string,
    data: { monthlyTokenLimit?: number; isUnlimited?: boolean }
  ) {
    const existing = await prisma.aIQuota.findUnique({ where: { userId } });

    if (existing) {
      return prisma.aIQuota.update({ where: { id: existing.id }, data });
    }

    // Create user-level override
    return prisma.aIQuota.create({
      data: {
        userId,
        monthlyTokenLimit: data.monthlyTokenLimit ?? 20_000,
        isUnlimited: data.isUnlimited ?? false,
        usedTokens: 0,
        resetAt: this.nextMonthReset(),
      },
    });
  }

  async listAllQuotas(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [quotas, total] = await Promise.all([
      prisma.aIQuota.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.aIQuota.count(),
    ]);
    return { quotas, total, page, limit };
  }

  // ─── Internal Helpers ─────────────────────────────────────────────────────

  /**
   * Enforces the restriction hierarchy:
   * - OWNER can restrict anyone
   * - ADMIN can restrict COMPANY, FARMER, DELIVERY_PARTNER only
   * - Others cannot restrict anyone
   */
  private assertCanRestrict(
    imposerRole: UserRole,
    targetRole: UserRole
  ): void {
    if (imposerRole === UserRole.OWNER) return; // Owner can restrict anyone

    if (imposerRole === UserRole.ADMIN) {
      if (!ADMIN_CAN_RESTRICT.includes(targetRole)) {
        throw Object.assign(
          new Error(
            "Admins can only restrict COMPANY, FARMER, and DELIVERY_PARTNER accounts."
          ),
          { statusCode: 403 }
        );
      }
      return;
    }

    // COMPANY, FARMER, DELIVERY_PARTNER, and all others cannot restrict anyone
    throw Object.assign(
      new Error("You do not have permission to restrict AI access for other users."),
      { statusCode: 403 }
    );
  }

  private nextMonthReset(): Date {
    const d = new Date();
    d.setMonth(d.getMonth() + 1, 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}

export const aiRestrictionService = new AiRestrictionService();

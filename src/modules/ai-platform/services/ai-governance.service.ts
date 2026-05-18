/**
 * AI Governance Service
 *
 * Core enforcement engine called as a pre-flight guard before every AI request.
 * Responsibilities:
 *   1. Check active user restrictions
 *   2. Check monthly token quota
 *   3. Log every AI usage attempt (success or failure)
 *   4. Increment token quota usage atomically
 */

import prisma from "../../../config/prisma";
import { UserRole, AIUsageStatus, AiProvider } from "@prisma/client";

// ─── Role-Level Quota Defaults (tokens/month) ──────────────────────────────
const ROLE_QUOTA_DEFAULTS: Record<UserRole, number> = {
  OWNER: 500_000,
  ADMIN: 100_000,
  COMPANY: 50_000,
  FARMER: 20_000,
  DELIVERY_PARTNER: 10_000,
};

// ─── Human-readable quota exceeded messages per role ───────────────────────
const QUOTA_EXCEEDED_MESSAGES: Record<UserRole, string> = {
  OWNER: "Your AI allocation has been reached. Please contact the platform team.",
  ADMIN:
    "You've reached the operational AI usage limit for your account today. Please try again later or contact the platform owner for additional allocation.",
  COMPANY:
    "Your AI usage quota for this billing cycle has been reached. Please upgrade your subscription or wait until the quota resets.",
  FARMER:
    "Your AI usage quota for this billing cycle has been reached. Please wait until next month or contact support.",
  DELIVERY_PARTNER:
    "Your AI usage quota for this billing cycle has been reached. Please wait until next month.",
};

// ─── Soft limit warning message for admins ──────────────────────────────────
const ADMIN_SOFT_LIMIT_THRESHOLD = 0.85; // 85% consumed

export interface AiPreflightContext {
  userId: string;
  role: UserRole;
}

export interface AiUsageLogParams {
  userId: string;
  role: UserRole;
  provider: AiProvider;
  modelName: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost?: number;
  requestPreview?: string;
  responsePreview?: string;
  route?: string;
  module?: string;
  status: AIUsageStatus;
  latencyMs?: number;
  sessionId?: string;
  contextHash?: string;
  largestContributor?: string;
}

export class AiGovernanceService {
  /**
   * Runs all governance checks before an AI request is processed.
   * Throws a structured error if the request should be blocked.
   */
  async runPreflightCheck(ctx: AiPreflightContext): Promise<void> {
    const { userId, role } = ctx;

    // OWNER bypasses all quota and restriction checks
    if (role === "OWNER") return;

    // 1. Check active restrictions
    await this.checkUserRestrictions(userId);

    // 2. Check token quota
    await this.checkUserQuota(userId, role);
  }

  /**
   * Checks if the user has any active (non-expired) restrictions.
   */
  private async checkUserRestrictions(userId: string): Promise<void> {
    const now = new Date();

    const activeRestriction = await prisma.userAIRestriction.findFirst({
      where: {
        userId,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: {
        restrictionCode: true,
      },
    });

    if (activeRestriction) {
      const code = activeRestriction.restrictionCode;
      if (code.severity === "BLOCK" || code.severity === "CRITICAL") {
        const reason = activeRestriction.reason
          ? ` Reason: ${activeRestriction.reason}`
          : "";

        throw Object.assign(
          new Error(
            `[${code.code}] ${code.title}: ${code.description}.${reason}`
          ),
          { statusCode: code.httpStatus, restrictionCode: code.code }
        );
      }
    }
  }

  /**
   * Checks if the user/role has remaining token quota for this month.
   * User-level quota takes priority over role-level quota.
   */
  private async checkUserQuota(userId: string, role: UserRole): Promise<void> {
    const now = new Date();

    // Prefer per-user quota override
    let quota = await prisma.aIQuota.findUnique({ where: { userId } });

    // Fallback to role-level quota
    if (!quota) {
      quota = await prisma.aIQuota.findFirst({ where: { role, userId: null } });
    }

    // If no quota record exists, allow the request (will be seeded on bootstrap)
    if (!quota) return;

    // If quota has reset period expired, auto-reset it
    if (quota.resetAt < now) {
      await prisma.aIQuota.update({
        where: { id: quota.id },
        data: {
          usedTokens: 0,
          resetAt: this.nextMonthReset(),
        },
      });
      quota.usedTokens = 0;
    }

    // Check if the user has an active non-blocking restriction tier that overrides their limit
    const activeTier = await prisma.userAIRestriction.findFirst({
      where: {
        userId,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: {
        restrictionCode: true,
      },
    });

    let effectiveLimit = quota.monthlyTokenLimit;
    let limitName = "Standard Account Quota";
    let isTierRestricted = false;

    if (activeTier) {
      const code = activeTier.restrictionCode.code;
      if (code === "AI-FREE-TIER") {
        effectiveLimit = 5_000;
        limitName = "Free Access Tier Override";
        isTierRestricted = true;
      } else if (code === "AI-LIMITED-ACCESS") {
        effectiveLimit = 15_000;
        limitName = "Limited Access Tier Override";
        isTierRestricted = true;
      }
    }

    // Unlimited quota bypass (unless overridden by an active subscription tier limit)
    if (quota.isUnlimited && !isTierRestricted) return;

    // Soft limit warning for admins (non-blocking)
    if (role === "ADMIN" && !isTierRestricted) {
      const consumedRatio = quota.usedTokens / effectiveLimit;
      if (consumedRatio >= ADMIN_SOFT_LIMIT_THRESHOLD && consumedRatio < 1) {
        console.warn(
          `[AI_GOVERNANCE] Admin ${userId} is at ${Math.round(consumedRatio * 100)}% quota.`
        );
        // Non-blocking — just a warning logged
      }
    }

    // Hard quota check
    if (quota.usedTokens >= effectiveLimit) {
      const message = isTierRestricted
        ? `Your AI ${limitName} limit of ${effectiveLimit.toLocaleString()} tokens has been exhausted for this cycle. Contact support or upgrade to remove this limit.`
        : (QUOTA_EXCEEDED_MESSAGES[role] || QUOTA_EXCEEDED_MESSAGES.FARMER);
      
      throw Object.assign(new Error(message), {
        statusCode: 429,
        restrictionCode: activeTier ? activeTier.restrictionCode.code : "AI-4001",
      });
    }
  }

  /**
   * Writes an AI usage log entry to the database.
   * Called after every AI request completion (success or failure).
   */
  async logUsage(params: AiUsageLogParams): Promise<void> {
    try {
      await prisma.aIUsageLog.create({
        data: {
          userId: params.role === "COMPANY" ? null : params.userId,
          companyId: params.role === "COMPANY" ? params.userId : null,
          role: params.role,
          provider: params.provider,
          modelName: params.modelName,
          promptTokens: params.promptTokens,
          completionTokens: params.completionTokens,
          totalTokens: params.totalTokens,
          estimatedCost: params.estimatedCost,
          requestPreview: params.requestPreview?.slice(0, 300),
          responsePreview: params.responsePreview?.slice(0, 300),
          route: params.route,
          status: params.status,
          latencyMs: params.latencyMs,
          sessionId: params.sessionId,
          contextHash: params.contextHash,
          largestContributor: params.largestContributor,
        },
      });
    } catch (err) {
      // Non-blocking — logging failures must never break AI requests
      console.error("[AI_GOVERNANCE] Failed to write usage log:", err);
    }
  }

  /**
   * Atomically increments the used token count for a user's quota.
   * Operates on user-level quota if exists, otherwise role-level.
   */
  async incrementQuota(
    userId: string,
    role: UserRole,
    tokens: number
  ): Promise<void> {
    if (tokens <= 0) return;

    try {
      // Try user-level quota first
      const userQuota = await prisma.aIQuota.findUnique({ where: { userId } });
      if (userQuota) {
        await prisma.aIQuota.update({
          where: { id: userQuota.id },
          data: { usedTokens: { increment: tokens } },
        });
        return;
      }

      // Fall back to role-level quota
      const roleQuota = await prisma.aIQuota.findFirst({
        where: { role, userId: null },
      });
      if (roleQuota) {
        await prisma.aIQuota.update({
          where: { id: roleQuota.id },
          data: { usedTokens: { increment: tokens } },
        });
      }
    } catch (err) {
      console.error("[AI_GOVERNANCE] Failed to increment quota:", err);
    }
  }

  /**
   * Resets a user's or role's token quota usage to zero.
   */
  async resetQuota(quotaId: string): Promise<void> {
    await prisma.aIQuota.update({
      where: { id: quotaId },
      data: { usedTokens: 0, resetAt: this.nextMonthReset() },
    });
  }

  private nextMonthReset(): Date {
    const d = new Date();
    d.setMonth(d.getMonth() + 1, 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}

export const aiGovernanceService = new AiGovernanceService();

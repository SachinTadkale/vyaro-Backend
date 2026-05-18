/**
 * AI Governance Controller
 *
 * Handles all governance, restriction, analytics, and quota management endpoints.
 * Strict RBAC enforced per handler:
 *   - OWNER: full access
 *   - ADMIN: restrictions + user usage only
 *   - Others: own quota only
 */

import { Request, Response } from "express";
import asyncHandler from "../../../utils/asyncHandler";
import { aiAnalyticsService } from "../services/ai-analytics.service";
import { aiRestrictionService } from "../services/ai-restriction.service";
import { aiGovernanceService } from "../services/ai-governance.service";
import { UserRole, AIUsageStatus, AiProvider, RestrictionSeverity } from "@prisma/client";
import { z } from "zod";
import prisma from "../../../config/prisma";

// ─── Input Validators ────────────────────────────────────────────────────────

const restrictUserSchema = z.object({
  targetUserId: z.string().min(1),
  restrictionCodeId: z.string().min(1),
  reason: z.string().optional(),
  expiresAt: z.string().datetime().optional().transform((v) => v ? new Date(v) : undefined),
});

const createCodeSchema = z.object({
  code: z.string().min(2).max(20).toUpperCase(),
  title: z.string().min(3).max(100),
  description: z.string().min(5),
  severity: z.nativeEnum(RestrictionSeverity),
  httpStatus: z.number().int().min(400).max(599).optional(),
});

const updateCodeSchema = createCodeSchema.partial().extend({
  isActive: z.boolean().optional(),
});

const updateQuotaSchema = z.object({
  monthlyTokenLimit: z.number().int().min(1000).optional(),
  isUnlimited: z.boolean().optional(),
});

const logsQuerySchema = z.object({
  userId: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  provider: z.nativeEnum(AiProvider).optional(),
  status: z.nativeEnum(AIUsageStatus).optional(),
  dateFrom: z.string().datetime().optional().transform((v) => v ? new Date(v) : undefined),
  dateTo: z.string().datetime().optional().transform((v) => v ? new Date(v) : undefined),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// ─── Analytics Controllers ────────────────────────────────────────────────────

/**
 * GET /ai/governance/analytics — OWNER only
 * Full analytics bundle: summary, trends, breakdowns, top users.
 */
export const getAIAnalyticsController = asyncHandler(async (req: Request, res: Response) => {
  const data = await aiAnalyticsService.getFullAnalytics();
  res.status(200).json({ success: true, data });
});

/**
 * GET /ai/governance/logs — OWNER only
 * Paginated raw AI usage logs with filtering.
 */
export const getAILogsController = asyncHandler(async (req: Request, res: Response) => {
  const filters = logsQuerySchema.parse(req.query);
  const result = await aiAnalyticsService.getUsageLogs(filters);
  res.status(200).json({ success: true, ...result });
});

/**
 * GET /ai/governance/user/:userId/usage — OWNER + ADMIN
 * Per-user usage summary.
 */
export const getUserUsageController = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  // ADMIN cannot view OWNER usage
  if (req.user.role === "ADMIN") {
    const target = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { role: true },
    });
    if (target?.role === "OWNER") {
      return res.status(403).json({ success: false, message: "Access denied." });
    }
  }

  const result = await aiAnalyticsService.getUsageLogs({ userId, page: 1, limit: 100 });
  res.status(200).json({ success: true, ...result });
});

// ─── Restriction Code Controllers ─────────────────────────────────────────────

/**
 * POST /ai/governance/restriction-codes — OWNER only
 */
export const createRestrictionCodeController = asyncHandler(async (req: Request, res: Response) => {
  const data = createCodeSchema.parse(req.body);
  const code = await aiRestrictionService.createRestrictionCode({
    ...data,
    createdById: req.user.userId,
  });
  res.status(201).json({ success: true, data: code });
});

/**
 * GET /ai/governance/restriction-codes — OWNER + ADMIN
 */
export const listRestrictionCodesController = asyncHandler(async (req: Request, res: Response) => {
  const { isActive, severity, search, page, limit } = req.query as any;
  const result = await aiRestrictionService.listRestrictionCodes({
    isActive: isActive !== undefined ? isActive === "true" : undefined,
    severity: severity as RestrictionSeverity | undefined,
    search,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 50,
  });
  res.status(200).json({ success: true, ...result });
});

/**
 * PATCH /ai/governance/restriction-codes/:id — OWNER only
 */
export const updateRestrictionCodeController = asyncHandler(async (req: Request, res: Response) => {
  const data = updateCodeSchema.parse(req.body);
  const code = await aiRestrictionService.updateRestrictionCode(req.params.id, data);
  res.status(200).json({ success: true, data: code });
});

// ─── User Restriction Controllers ─────────────────────────────────────────────

/**
 * POST /ai/governance/restrict-user — OWNER + ADMIN (with hierarchy check)
 */
export const restrictUserController = asyncHandler(async (req: Request, res: Response) => {
  const data = restrictUserSchema.parse(req.body);
  const restriction = await aiRestrictionService.restrictUser({
    targetUserId: data.targetUserId,
    restrictionCodeId: data.restrictionCodeId,
    imposedById: req.user.userId,
    imposedByRole: req.user.role as UserRole,
    reason: data.reason,
    expiresAt: data.expiresAt,
  });
  res.status(201).json({ success: true, data: restriction });
});

/**
 * DELETE /ai/governance/restrictions/:id — OWNER + ADMIN
 */
export const removeRestrictionController = asyncHandler(async (req: Request, res: Response) => {
  await aiRestrictionService.removeRestriction(
    req.params.id,
    req.user.userId,
    req.user.role as UserRole
  );
  res.status(200).json({ success: true, message: "Restriction removed successfully." });
});

/**
 * GET /ai/governance/restrictions — OWNER + ADMIN
 */
export const listRestrictionsController = asyncHandler(async (req: Request, res: Response) => {
  const { userId, isActive, page, limit } = req.query as any;
  const result = await aiRestrictionService.listRestrictions({
    userId,
    isActive: isActive !== undefined ? isActive === "true" : undefined,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 50,
  });
  res.status(200).json({ success: true, ...result });
});

// ─── Quota Controllers ────────────────────────────────────────────────────────

/**
 * PATCH /ai/governance/quota/:userId — OWNER only
 */
export const updateQuotaController = asyncHandler(async (req: Request, res: Response) => {
  const data = updateQuotaSchema.parse(req.body);
  const quota = await aiRestrictionService.updateUserQuota(req.params.userId, data);
  res.status(200).json({ success: true, data: quota });
});

/**
 * GET /ai/governance/quota — OWNER only — all quotas
 */
export const listQuotasController = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as any;
  const result = await aiRestrictionService.listAllQuotas(
    page ? Number(page) : 1,
    limit ? Number(limit) : 50
  );
  res.status(200).json({ success: true, ...result });
});

/**
 * GET /ai/governance/my-quota — any authenticated user
 */
export const getMyQuotaController = asyncHandler(async (req: Request, res: Response) => {
  const quota = await aiRestrictionService.getUserQuota(req.user.userId);
  res.status(200).json({ success: true, data: quota });
});

/**
 * GET /ai/governance/users/search — OWNER + ADMIN
 * Search users and companies by name, email, or phone.
 */
export const searchUsersController = asyncHandler(async (req: Request, res: Response) => {
  const { q } = req.query;
  if (!q || typeof q !== "string") {
    return res.status(200).json({ success: true, data: [] });
  }

  const query = q.trim();

  // Search User table
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { phone_no: { contains: query, mode: "insensitive" } },
        { user_id: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 10,
    select: {
      user_id: true,
      name: true,
      email: true,
      phone_no: true,
      role: true,
    },
  });

  // Search Company table
  const companies = await prisma.company.findMany({
    where: {
      OR: [
        { companyName: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { registrationNo: { contains: query, mode: "insensitive" } },
        { companyId: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 10,
    select: {
      companyId: true,
      companyName: true,
      email: true,
      registrationNo: true,
    },
  });

  const formattedUsers = users.map((u) => ({
    id: u.user_id,
    name: u.name,
    role: u.role,
    email: u.email || "N/A",
    phone: u.phone_no,
  }));

  const formattedCompanies = companies.map((c) => ({
    id: c.companyId,
    name: `${c.companyName} (Company)`,
    role: "COMPANY" as UserRole,
    email: c.email,
    phone: `Reg: ${c.registrationNo}`,
  }));

  res.status(200).json({
    success: true,
    data: [...formattedUsers, ...formattedCompanies],
  });
});

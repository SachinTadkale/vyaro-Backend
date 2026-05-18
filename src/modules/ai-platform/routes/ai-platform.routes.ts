import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authMiddleware } from "../../../middleware/auth.middleware";
import { adminOnly } from "../../../middleware/admin.middleware";
import { requireOwnerAccess } from "../../../middleware/owner.middleware";
import { createRateLimiter } from "../../../middleware/rateLimit.middleware";
import { requireUserRole } from "../../../middleware/rbac.middleware";
import {
  chatController,
  badgePromptController,
  getSessionsController,
  getSessionHistoryController,
  archiveSessionController,
  deleteSessionController,
  getPromptsController,
  getAdminAnalyticsController,
  getAdminUsageController,
} from "../controllers/ai-gateway.controller";
import {
  getAIAnalyticsController,
  getAILogsController,
  getUserUsageController,
  createRestrictionCodeController,
  listRestrictionCodesController,
  updateRestrictionCodeController,
  restrictUserController,
  removeRestrictionController,
  listRestrictionsController,
  updateQuotaController,
  listQuotasController,
  getMyQuotaController,
  searchUsersController,
} from "../controllers/ai-governance.controller";

const aiChatLimiter = createRateLimiter({
  keyPrefix: "saira-chat",
  windowMs: 60 * 1000,
  maxRequests: 20,
});

const aiReadLimiter = createRateLimiter({
  keyPrefix: "saira-read",
  windowMs: 60 * 1000,
  maxRequests: 60,
});

const router = Router();

// ─── AUTHENTICATED USER ENDPOINTS ────────────────────────────────────────────

router.post(
  "/chat",
  authMiddleware,
  requireUserRole(UserRole.FARMER, UserRole.COMPANY, UserRole.DELIVERY_PARTNER, UserRole.ADMIN, UserRole.OWNER),
  aiChatLimiter,
  chatController
);

router.post(
  "/badge-prompt",
  authMiddleware,
  requireUserRole(UserRole.FARMER, UserRole.COMPANY, UserRole.DELIVERY_PARTNER, UserRole.ADMIN, UserRole.OWNER),
  aiChatLimiter,
  badgePromptController
);

router.get(
  "/sessions",
  authMiddleware,
  requireUserRole(UserRole.FARMER, UserRole.COMPANY, UserRole.DELIVERY_PARTNER, UserRole.ADMIN, UserRole.OWNER),
  aiReadLimiter,
  getSessionsController
);

router.get(
  "/sessions/:id",
  authMiddleware,
  requireUserRole(UserRole.FARMER, UserRole.COMPANY, UserRole.DELIVERY_PARTNER, UserRole.ADMIN, UserRole.OWNER),
  aiReadLimiter,
  getSessionHistoryController
);

router.post(
  "/sessions/:id/archive",
  authMiddleware,
  requireUserRole(UserRole.FARMER, UserRole.COMPANY, UserRole.DELIVERY_PARTNER, UserRole.ADMIN, UserRole.OWNER),
  aiReadLimiter,
  archiveSessionController
);

router.delete(
  "/sessions/:id",
  authMiddleware,
  requireUserRole(UserRole.FARMER, UserRole.COMPANY, UserRole.DELIVERY_PARTNER, UserRole.ADMIN, UserRole.OWNER),
  aiReadLimiter,
  deleteSessionController
);

router.get(
  "/prompts",
  authMiddleware,
  requireUserRole(UserRole.FARMER, UserRole.COMPANY, UserRole.DELIVERY_PARTNER, UserRole.ADMIN, UserRole.OWNER),
  aiReadLimiter,
  getPromptsController
);

// ─── LEGACY ADMIN METRICS (preserved) ────────────────────────────────────────

router.get(
  "/admin/analytics",
  authMiddleware,
  adminOnly,
  aiReadLimiter,
  getAdminAnalyticsController
);

router.get(
  "/admin/usage",
  authMiddleware,
  adminOnly,
  aiReadLimiter,
  getAdminUsageController
);

// ─── GOVERNANCE: OWNER + ADMIN READ-ONLY ────────────────────────────────────────

router.get(
  "/governance/analytics",
  authMiddleware,
  adminOnly,
  aiReadLimiter,
  getAIAnalyticsController
);

router.get(
  "/governance/logs",
  authMiddleware,
  adminOnly,
  aiReadLimiter,
  getAILogsController
);

router.get(
  "/governance/users/search",
  authMiddleware,
  adminOnly,
  aiReadLimiter,
  searchUsersController
);

// ─── GOVERNANCE: OWNER + ADMIN SHARED ────────────────────────────────────────

router.get(
  "/governance/user/:userId/usage",
  authMiddleware,
  adminOnly,
  aiReadLimiter,
  getUserUsageController
);

router.get(
  "/governance/restrictions",
  authMiddleware,
  adminOnly,
  aiReadLimiter,
  listRestrictionsController
);

router.post(
  "/governance/restrict-user",
  authMiddleware,
  adminOnly,
  restrictUserController
);

router.delete(
  "/governance/restrictions/:id",
  authMiddleware,
  adminOnly,
  removeRestrictionController
);

router.get(
  "/governance/restriction-codes",
  authMiddleware,
  adminOnly,
  aiReadLimiter,
  listRestrictionCodesController
);

// ─── GOVERNANCE: OWNER-ONLY ───────────────────────────────────────────────────

router.post(
  "/governance/restriction-codes",
  authMiddleware,
  requireOwnerAccess,
  createRestrictionCodeController
);

router.patch(
  "/governance/restriction-codes/:id",
  authMiddleware,
  requireOwnerAccess,
  updateRestrictionCodeController
);

router.patch(
  "/governance/quota/:userId",
  authMiddleware,
  requireOwnerAccess,
  updateQuotaController
);

router.get(
  "/governance/quotas",
  authMiddleware,
  adminOnly,
  aiReadLimiter,
  listQuotasController
);

// ─── GOVERNANCE: ANY AUTHENTICATED USER ──────────────────────────────────────

router.get(
  "/governance/my-quota",
  authMiddleware,
  requireUserRole(UserRole.FARMER, UserRole.COMPANY, UserRole.DELIVERY_PARTNER, UserRole.ADMIN, UserRole.OWNER),
  aiReadLimiter,
  getMyQuotaController
);

export default router;

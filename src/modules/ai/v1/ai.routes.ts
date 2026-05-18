import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authMiddleware } from "../../../middleware/auth.middleware";
import { adminOnly } from "../../../middleware/admin.middleware";
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
} from "../controllers/ai.controller";

const aiChatLimiter = createRateLimiter({
  keyPrefix: "ai-chat",
  windowMs: 60 * 1000, // 1 minute window
  maxRequests: 15,     // Limit users to 15 messages/minute
});

const aiReadLimiter = createRateLimiter({
  keyPrefix: "ai-read",
  windowMs: 60 * 1000,
  maxRequests: 60,
});

const router = Router();

// --- USER ENDPOINTS ---

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

// --- ADMIN / OWNER ANALYTICS ENDPOINTS ---

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

export default router;

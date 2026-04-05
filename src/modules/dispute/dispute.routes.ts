import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { adminOnly } from "../../middleware/admin.middleware";
import { createRateLimiter } from "../../middleware/rateLimit.middleware";
import { requireActor } from "../../middleware/rbac.middleware";
import {
  createDisputeController,
  getDisputeController,
  resolveDisputeController,
} from "./dispute.controller";

const createDisputeLimiter = createRateLimiter({
  keyPrefix: "dispute-create",
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
});

const disputeReadLimiter = createRateLimiter({
  keyPrefix: "dispute-read",
  windowMs: 60 * 1000,
  maxRequests: 60,
});

const disputeResolveLimiter = createRateLimiter({
  keyPrefix: "dispute-resolve",
  windowMs: 60 * 1000,
  maxRequests: 20,
});

const router = Router();

router.post(
  "/",
  authMiddleware,
  requireActor("USER", "COMPANY"),
  createDisputeLimiter,
  createDisputeController,
);

router.get(
  "/:id",
  authMiddleware,
  disputeReadLimiter,
  getDisputeController,
);

router.patch(
  "/:id/resolve",
  authMiddleware,
  adminOnly,
  disputeResolveLimiter,
  resolveDisputeController,
);

export default router;

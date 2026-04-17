import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { adminOnly } from "../../middleware/admin.middleware";
import { createRateLimiter } from "../../middleware/rateLimit.middleware";
import {
  createBroadcastController,
  deleteBroadcastController,
  getActiveBroadcastsController,
  listBroadcastsController,
  updateBroadcastController,
} from "./broadcast.controller";

const router = Router();

const broadcastWriteLimiter = createRateLimiter({
  keyPrefix: "broadcast-write",
  windowMs: 60 * 1000,
  maxRequests: 20,
});

const broadcastReadLimiter = createRateLimiter({
  keyPrefix: "broadcast-read",
  windowMs: 60 * 1000,
  maxRequests: 120,
});

router.get(
  "/active",
  authMiddleware,
  broadcastReadLimiter,
  getActiveBroadcastsController,
);
router.get(
  "/getActiveBroadcasts",
  authMiddleware,
  broadcastReadLimiter,
  getActiveBroadcastsController,
);

router.post(
  "/createBroadcast",
  authMiddleware,
  adminOnly,
  broadcastWriteLimiter,
  createBroadcastController,
);

router.get(
  "/getBroadcasts",
  authMiddleware,
  adminOnly,
  broadcastReadLimiter,
  listBroadcastsController,
);

router.patch(
  "/updateBroadcast/:id",
  authMiddleware,
  adminOnly,
  broadcastWriteLimiter,
  updateBroadcastController,
);

router.delete(
  "/deleteBroadcast/:id",
  authMiddleware,
  adminOnly,
  broadcastWriteLimiter,
  deleteBroadcastController,
);

export default router;

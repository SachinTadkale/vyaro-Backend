/**
 * Module: Delivery.routes
 * Purpose: Implements the Delivery.routes module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { Router } from "express";
import { authMiddleware } from "../../../middleware/auth.middleware";
import { createRateLimiter } from "../../../middleware/rateLimit.middleware";
import { requireDeliveryAccess } from "../../../middleware/rbac.middleware";
import {
  acceptJobController,
  assignDeliveryController,
  autoAssignDeliveryController,
  getActiveController,
  getDashboardController,
  getDeliveryController,
  getJobsController,
  updateDeliveryStatusController,
} from "./delivery.controller";

const router = Router();

const deliveryAssignLimiter = createRateLimiter({
  keyPrefix: "delivery-assign",
  windowMs: 60 * 1000,
  maxRequests: 10,
});

const deliveryStatusLimiter = createRateLimiter({
  keyPrefix: "delivery-status-update",
  windowMs: 60 * 1000,
  maxRequests: 30,
});

const deliveryReadLimiter = createRateLimiter({
  keyPrefix: "delivery-read",
  windowMs: 60 * 1000,
  maxRequests: 120,
});

router.post(
  "/assign",
  authMiddleware,
  requireDeliveryAccess("COMPANY", "ADMIN"),
  deliveryAssignLimiter,
  assignDeliveryController,
);

router.post(
  "/auto-assign",
  authMiddleware,
  requireDeliveryAccess("COMPANY", "ADMIN"),
  deliveryAssignLimiter,
  autoAssignDeliveryController,
);

router.patch(
  "/:id/status",
  authMiddleware,
  requireDeliveryAccess("DELIVERY_PARTNER", "COMPANY", "ADMIN"),
  deliveryStatusLimiter,
  updateDeliveryStatusController,
);

router.get(
  "/:id",
  authMiddleware,
  requireDeliveryAccess("DELIVERY_PARTNER", "COMPANY", "ADMIN"),
  deliveryReadLimiter,
  getDeliveryController,
);

router.get(
  "/jobs",
  authMiddleware,
  requireDeliveryAccess("DELIVERY_PARTNER"),
  getJobsController,
);

router.post(
  "/accept/:id",
  authMiddleware,
  requireDeliveryAccess("DELIVERY_PARTNER"),
  acceptJobController,
);

router.get(
  "/active",
  authMiddleware,
  requireDeliveryAccess("DELIVERY_PARTNER"),
  getActiveController,
);

router.get(
  "/dashboard",
  authMiddleware,
  requireDeliveryAccess("DELIVERY_PARTNER"),
  getDashboardController,
);

export default router;

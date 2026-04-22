import { UserRole } from "@prisma/client";
import { Router } from "express";
import { authMiddleware } from "../../../middleware/auth.middleware";
import { createRateLimiter } from "../../../middleware/rateLimit.middleware";
import { requireUserRole } from "../../../middleware/rbac.middleware";
import {
  createDeliveryPartnerProfileController,
  getDeliveryPartnerJobsController,
  getDeliveryPartnerProfileController,
  updateDeliveryPartnerAvailabilityController,
  updateDeliveryPartnerLocationController,
} from "./delivery-partners.controller";

const router = Router();

const createProfileLimiter = createRateLimiter({
  keyPrefix: "delivery-partner-profile-create",
  windowMs: 15 * 60 * 1000,
  maxRequests: 3,
});

const availabilityLimiter = createRateLimiter({
  keyPrefix: "delivery-partner-availability-update",
  windowMs: 60 * 1000,
  maxRequests: 20,
});

const jobsLimiter = createRateLimiter({
  keyPrefix: "delivery-partner-jobs-read",
  windowMs: 60 * 1000,
  maxRequests: 120,
});

router.use(authMiddleware, requireUserRole(UserRole.DELIVERY_PARTNER));

router.post(
  "/profile",
  createProfileLimiter,
  createDeliveryPartnerProfileController,
);

router.get("/profile", getDeliveryPartnerProfileController);

router.patch(
  "/availability",
  availabilityLimiter,
  updateDeliveryPartnerAvailabilityController,
);

router.get("/jobs", jobsLimiter, getDeliveryPartnerJobsController);

router.patch("/updateLocation", updateDeliveryPartnerLocationController);

export default router;

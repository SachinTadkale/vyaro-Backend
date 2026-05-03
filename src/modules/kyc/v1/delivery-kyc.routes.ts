/**
 * Module: Delivery Kyc Routes
 * Purpose: Implements bulk KYC routes for delivery partners.
 */
import { Router } from "express";
import { uploadDeliveryKyc } from "./delivery-kyc.controller";
import { authMiddleware } from "../../../middleware/auth.middleware";
import { upload } from "../../../middleware/upload.middleware";
import { createRateLimiter } from "../../../middleware/rateLimit.middleware";

const router = Router();
const deliveryKycLimiter = createRateLimiter({
  keyPrefix: "delivery-kyc-upload",
  windowMs: 60 * 1000,
  maxRequests: 5,
});

router.post(
  "/",
  authMiddleware,
  deliveryKycLimiter,
  upload.fields([
    { name: "idFrontImage", maxCount: 1 },
    { name: "idBackImage", maxCount: 1 },
    { name: "drivingLicenseImage", maxCount: 1 },
    { name: "rcImage", maxCount: 1 },
  ]),
  uploadDeliveryKyc
);

export default router;

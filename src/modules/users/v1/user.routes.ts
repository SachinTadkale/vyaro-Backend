import { Router } from "express";
import { authMiddleware } from "../../../middleware/auth.middleware";
import { verifiedOnly } from "../../../middleware/verification.middleware";
import { uploadKYC } from "./user.controller";
import { upload } from "../../../middleware/upload.middleware";
import { createRateLimiter } from "../../../middleware/rateLimit.middleware";

const router = Router();
const userUploadLimiter = createRateLimiter({
  keyPrefix: "user-upload",
  windowMs: 60 * 1000,
  maxRequests: 10,
});
const userReadLimiter = createRateLimiter({
  keyPrefix: "user-read",
  windowMs: 60 * 1000,
  maxRequests: 120,
});

/**
 * Upload KYC
 * POST /api/user/upload-kyc
 */
router.post(
  "/upload-kyc",
  authMiddleware,
  userUploadLimiter,
  upload.single("document"), // field name in Postman
  uploadKYC
);

/**
 * User Dashboard
 * GET /api/user/dashboard
 */
router.get(
  "/dashboard",
  authMiddleware,
  verifiedOnly,
  userReadLimiter,
  (req: any, res) => {
    res.status(200).json({
      success: true,
      message: "Dashboard access granted",
      user: req.user,
    });
  }
);

export default router;

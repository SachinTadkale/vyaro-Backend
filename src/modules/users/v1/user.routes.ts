/**
 * Module: User.routes
 * Purpose: Implements the User.routes module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { Router } from "express";
import { authMiddleware } from "../../../middleware/auth.middleware";
import { verifiedOnly } from "../../../middleware/verification.middleware";
import { uploadKYC, updateProfileImage } from "./user.controller";
import { upload } from "../../../middleware/upload.middleware";
import { createRateLimiter } from "../../../middleware/rateLimit.middleware";
import prisma from "../../../config/prisma";

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
 * Update Profile Image
 * PATCH /api/user/profile-image
 */
router.patch(
  "/profile-image",
  authMiddleware,
  userUploadLimiter,
  upload.single("image"),
  updateProfileImage
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
  async (req: any, res) => {
    const dbUser = await prisma.user.findUnique({
      where: { user_id: req.user.userId },
      select: {
        user_id: true,
        name: true,
        email: true,
        role: true,
        profileImage: true,
        verificationStatus: true,
      }
    });

    res.status(200).json({
      success: true,
      message: "Dashboard access granted",
      user: dbUser || req.user,
    });
  }
);

export default router;

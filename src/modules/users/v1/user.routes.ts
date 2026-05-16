/**
 * Module: User.routes
 * Purpose: Implements the User.routes module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { Router } from "express";
import { authMiddleware } from "../../../middleware/auth.middleware";
import { verifiedOnly } from "../../../middleware/verification.middleware";
import { uploadKYC, updateProfileImage, getProfile, updateProfile } from "./user.controller";
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
 * Get Current User Profile
 * GET /api/v1/users/me
 */
router.get(
  "/me",
  authMiddleware,
  userReadLimiter,
  getProfile
);

/**
 * Update Profile
 * PATCH /api/v1/users/me
 */
router.patch(
  "/me",
  authMiddleware,
  userUploadLimiter,
  updateProfile
);

/**
 * Upload Profile Avatar
 * POST /api/v1/users/me/avatar
 */
router.post(
  "/me/avatar",
  authMiddleware,
  userUploadLimiter,
  upload.single("image"),
  updateProfileImage
);

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
 * @deprecated Use /me/avatar
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

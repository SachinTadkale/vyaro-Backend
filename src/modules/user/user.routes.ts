import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { verifiedOnly } from "../../middleware/verification.middleware";
import { uploadKYC } from "./user.controller";
import { upload } from "../../middleware/upload.middleware";

const router = Router();

/**
 * Upload KYC
 * POST /api/user/upload-kyc
 */
router.post(
  "/upload-kyc",
  authMiddleware,
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
  (req: any, res) => {
    res.status(200).json({
      success: true,
      message: "Dashboard access granted",
      user: req.user,
    });
  }
);

export default router;
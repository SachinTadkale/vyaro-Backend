import { Router } from "express";
import { uploadKyc } from "./kyc.controller";
import { authMiddleware } from "../../../middleware/auth.middleware";
import { upload } from "../../../middleware/upload.middleware";
import { createRateLimiter } from "../../../middleware/rateLimit.middleware";

const router = Router();
const kycUploadLimiter = createRateLimiter({
  keyPrefix: "kyc-upload",
  windowMs: 60 * 1000,
  maxRequests: 8,
});

router.post(
  "/",
  authMiddleware,
  kycUploadLimiter,
  upload.fields([
    { name: "frontImage", maxCount: 1 },
    { name: "backImage", maxCount: 1 },
  ]),
  uploadKyc
);

export default router;

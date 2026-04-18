import { Router } from "express";
import * as controller from "./company.controller";
import { authMiddleware } from "../../../middleware/auth.middleware";
import { upload } from "../../../middleware/upload.middleware";
import { createRateLimiter } from "../../../middleware/rateLimit.middleware";

const router = Router();
const companyProfileWriteLimiter = createRateLimiter({
  keyPrefix: "company-profile-write",
  windowMs: 60 * 1000,
  maxRequests: 10,
});
const companyProfileReadLimiter = createRateLimiter({
  keyPrefix: "company-profile-read",
  windowMs: 60 * 1000,
  maxRequests: 120,
});

router.use(authMiddleware);

router.get("/", companyProfileReadLimiter, controller.getCompanyProfile);

router.put(
  "/profile-image",
  companyProfileWriteLimiter,
  upload.single("image"),
  controller.uploadProfileImage
);

router.delete("/profile-image", companyProfileWriteLimiter, controller.deleteProfileImage);

export default router;

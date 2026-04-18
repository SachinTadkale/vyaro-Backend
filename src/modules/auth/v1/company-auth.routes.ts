import { Router } from "express";
import * as controller from "./company-auth.controller";
import { upload } from "../../../middleware/upload.middleware";
import { createRateLimiter } from "../../../middleware/rateLimit.middleware";

const router = Router();
const companyAuthLimiter = createRateLimiter({
  keyPrefix: "company-auth",
  windowMs: 60 * 1000,
  maxRequests: 10,
});
const companyUploadLimiter = createRateLimiter({
  keyPrefix: "company-doc-upload",
  windowMs: 60 * 1000,
  maxRequests: 5,
});

router.post("/register", companyAuthLimiter, controller.registerCompany);

router.post(
  "/upload-documents",
  companyUploadLimiter,
  upload.fields([
    { name: "gst", maxCount: 1 },
    { name: "license", maxCount: 1 },
  ]),
  controller.uploadDocuments,
);

router.post("/login", companyAuthLimiter, controller.loginCompany);

router.post("/logout", controller.logoutCompany);

export default router;

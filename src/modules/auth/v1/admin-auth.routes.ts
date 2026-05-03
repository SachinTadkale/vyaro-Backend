/**
 * Module: Admin Auth.routes
 * Purpose: Implements the Admin Auth.routes module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { Router } from "express";
import {
  forgotPasswordAdminController,
  loginAdminController,
  resetPasswordAdminController,
} from "./admin-auth.controller";
import { createRateLimiter } from "../../../middleware/rateLimit.middleware";

const router = Router();
const adminAuthLimiter = createRateLimiter({
  keyPrefix: "admin-auth",
  windowMs: 60 * 1000,
  maxRequests: 8,
});
const adminOtpLimiter = createRateLimiter({
  keyPrefix: "admin-auth-otp",
  windowMs: 60 * 1000,
  maxRequests: 4,
});

router.post("/forgot-password", adminOtpLimiter, forgotPasswordAdminController);
router.post("/login", adminAuthLimiter, loginAdminController);
router.post("/reset-password", adminAuthLimiter, resetPasswordAdminController);

export default router;

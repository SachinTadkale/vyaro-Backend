/**
 * Module: User Auth.routes
 * Purpose: Implements the User Auth.routes module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { Router } from "express";
import {
  registerUser,
  loginUser,
  requestOtpController,
  loginWithOtpController,
  resetPasswordController,
  forgotPasswordController,
  meController,
} from "./user-auth.controller";
import { authMiddleware } from "../../../middleware/auth.middleware";
import { createRateLimiter } from "../../../middleware/rateLimit.middleware";

const router = Router();
const authWriteLimiter = createRateLimiter({
  keyPrefix: "auth-write",
  windowMs: 60 * 1000,
  maxRequests: 12,
});
const authOtpLimiter = createRateLimiter({
  keyPrefix: "auth-otp",
  windowMs: 60 * 1000,
  maxRequests: 6,
});

router.post("/register", authWriteLimiter, registerUser);
router.post("/login", authWriteLimiter, loginUser);
router.post("/request-otp", authOtpLimiter, requestOtpController);
router.post("/login-with-otp", authWriteLimiter, loginWithOtpController);
router.post("/forgot-password", authOtpLimiter, forgotPasswordController);
router.post("/reset-password", authWriteLimiter, resetPasswordController);
router.get("/me", authMiddleware, meController);

export default router;

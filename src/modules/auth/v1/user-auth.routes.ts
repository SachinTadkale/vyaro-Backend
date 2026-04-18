import { Router } from "express";
import {
  registerUser,
  loginUser,
  requestOtpController,
  loginWithOtpController,
  resetPasswordController,
  forgotPasswordController,
} from "./user-auth.controller";
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

export default router;

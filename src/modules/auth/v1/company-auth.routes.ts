/**
 * Module: Company Auth.routes
 * Purpose: Route definitions for Company Auth — registration, login, logout, and password reset.
 */
import { Router } from "express";
import * as controller from "./company-auth.controller";
import { upload } from "../../../middleware/upload.middleware";
import { createRateLimiter } from "../../../middleware/rateLimit.middleware";

const router = Router();

// General auth limiter — 10 req/min (register, login, logout)
const companyAuthLimiter = createRateLimiter({
  keyPrefix: "company-auth",
  windowMs: 60 * 1000,
  maxRequests: 10,
});

// Document upload limiter — 5 req/min
const companyUploadLimiter = createRateLimiter({
  keyPrefix: "company-doc-upload",
  windowMs: 60 * 1000,
  maxRequests: 5,
});

// Forgot password limiter — stricter: 5 req per 15 min to prevent OTP flooding
const forgotPasswordLimiter = createRateLimiter({
  keyPrefix: "company-forgot-password",
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
});

// OTP verify limiter — 10 req per 15 min to deter brute force
const verifyOtpLimiter = createRateLimiter({
  keyPrefix: "company-verify-otp",
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
});

// Reset password limiter — 5 req per 15 min
const resetPasswordLimiter = createRateLimiter({
  keyPrefix: "company-reset-password",
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
});

/* -------------------------------------------------------------------------- */
/*                               EXISTING ROUTES                               */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*                          PASSWORD RESET FLOW                                */
/* -------------------------------------------------------------------------- */

/**
 * POST /api/v1/auth/company/forgot-password
 * Step 1: Request a password reset OTP.
 * Body: { email: string }
 */
router.post("/forgot-password", forgotPasswordLimiter, controller.forgotCompanyPassword);

/**
 * POST /api/v1/auth/company/verify-reset-otp
 * Step 2: Verify the OTP received in email.
 * Body: { email: string, otp: string }
 */
router.post("/verify-reset-otp", verifyOtpLimiter, controller.verifyCompanyResetOtp);

/**
 * POST /api/v1/auth/company/reset-password
 * Step 3: Reset the password using a verified OTP.
 * Body: { email: string, otp: string, newPassword: string }
 */
router.post("/reset-password", resetPasswordLimiter, controller.resetCompanyPassword);

export default router;


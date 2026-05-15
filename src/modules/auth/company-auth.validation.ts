/**
 * Module: Company Auth.validation
 * Purpose: Zod validation schemas for all Company Auth endpoints, including password reset flow.
 */
import { z, ZodType } from "zod";
import ApiError from "../../utils/apiError";

const nonEmptyString = z.string().trim().min(1);

/**
 * Register Company Schema.
 */
export const registerCompanySchema = z.object({
  companyName: nonEmptyString,
  registrationNo: nonEmptyString.max(100),
  hqLocation: nonEmptyString.max(255),
  gstNumber: nonEmptyString.max(50),
  email: z.string().trim().email({
    message: "Invalid email",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters",
  }),
}).strict();

/**
 * Upload Company Documents Schema.
 */
export const uploadCompanyDocumentsSchema = z.object({
  companyId: nonEmptyString,
}).strict();

/**
 * Company Login Schema.
 */
export const companyLoginSchema = z.object({
  registrationNo: nonEmptyString.max(100),
  password: z.string().min(1, { message: "Password is required" }),
}).strict();

// ─── Password Reset Schemas ───────────────────────────────────────────────────

/**
 * Forgot Password Schema.
 * Only accepts a valid email — we do NOT reveal whether the account exists.
 */
export const companyForgotPasswordSchema = z.object({
  email: z.string().trim().email({ message: "A valid email address is required." }),
}).strict();

/**
 * Verify Reset OTP Schema.
 * OTP must be exactly 6 numeric digits.
 */
export const companyVerifyResetOtpSchema = z.object({
  email: z.string().trim().email({ message: "A valid email address is required." }),
  otp: z
    .string()
    .trim()
    .length(6, { message: "OTP must be exactly 6 digits." })
    .regex(/^\d{6}$/, { message: "OTP must be numeric." }),
}).strict();

/**
 * Reset Password Schema.
 * - Minimum 8 characters
 * - newPassword and confirmPassword must match
 */
export const companyResetPasswordSchema = z
  .object({
    email: z.string().trim().email({ message: "A valid email address is required." }),
    otp: z
      .string()
      .trim()
      .length(6, { message: "OTP must be exactly 6 digits." })
      .regex(/^\d{6}$/, { message: "OTP must be numeric." }),
    newPassword: z
      .string()
      .min(8, { message: "Password must be at least 8 characters." })
      .max(128, { message: "Password must be at most 128 characters." }),
  })
  .strict();

// ─── Schema Validator ─────────────────────────────────────────────────────────

/**
 * Validate Schema.
 */
export const validateSchema = <T>(schema: ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new ApiError(400, "Validation failed", {
      code: "VALIDATION_ERROR",
      details: result.error.flatten(),
    });
  }

  return result.data;
};


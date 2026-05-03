/**
 * Module: Admin Auth.validation
 * Purpose: Implements the Admin Auth.validation module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { z, ZodType } from "zod";
import ApiError from "../../utils/apiError";

const emailSchema = z.string().trim().email({
  message: "Invalid email",
});

const passwordSchema = z.string().min(8, {
  message: "Password must be at least 8 characters",
});

const otpSchema = z.string().trim().regex(/^\d{6}$/, {
  message: "OTP must be a 6 digit code",
});

/**
 * Login Admin Schema.
 */
export const loginAdminSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: "Password is required" }),
}).strict();

/**
 * Forgot Password Admin Schema.
 */
export const forgotPasswordAdminSchema = z.object({
  email: emailSchema,
}).strict();

/**
 * Reset Password Admin Schema.
 */
export const resetPasswordAdminSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
  newPassword: passwordSchema,
  confirmPassword: passwordSchema,
}).strict();

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

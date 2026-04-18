import { Gender } from "@prisma/client";
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

export const registerSchema = z.object({
  name: z.string().trim().min(1, { message: "Name is required" }),
  email: emailSchema,
  phone_no: z.string().regex(/^[0-9]{10}$/, {
    message: "Phone number must be exactly 10 digits",
  }),
  password: passwordSchema,
  address: z.string().trim().min(1, {
    message: "Address is required",
  }),
  gender: z.nativeEnum(Gender).optional(),
}).strict();

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: "Password is required" }),
}).strict();

export const requestOtpSchema = z.object({
  email: emailSchema,
}).strict();

export const loginWithOtpSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
}).strict();

export const forgotPasswordSchema = z.object({
  email: emailSchema,
}).strict();

export const resetPasswordSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
  newPassword: passwordSchema,
  confirmPassword: passwordSchema,
}).strict();

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

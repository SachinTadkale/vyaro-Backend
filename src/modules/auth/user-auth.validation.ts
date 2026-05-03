/**
 * Module: User Auth Validation
 * Purpose: Validates user auth payloads for registration, login, OTP, and password reset flows.
 * Used by: src/modules/auth/v1/user-auth.controller.ts
 */
import { z, ZodType } from "zod";
import ApiError from "../../utils/apiError";

const emailSchema = z.string().trim().email({
  message: "Invalid email",
});

const passwordSchema = z.string().min(8, {
  message: "Password must be at least 8 characters",
});

const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, {
    message: "OTP must be a 6 digit code",
  });

const roleEnum = z.enum(["FARMER", "DELIVERY_PARTNER"]);
const genderEnum = z.enum(["MALE", "FEMALE", "OTHER"]);

export const registerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: emailSchema,
  phone_no: z
    .string()
    .min(10, "Phone number must be 10 digits")
    .max(10, "Phone number must be 10 digits")
    .regex(/^[0-9]+$/, "Invalid phone number"),
  password: z.string().min(6, "Password must be at least 6 chars"),
  address: z.string().min(2, "Address is required"),
  gender: z.preprocess(
    (val) => (val === undefined || val === null || val === "" ? undefined : val),
    genderEnum.optional(),
  ),
  role: z.preprocess(
    (val) => (val === undefined || val === null ? undefined : val),
    roleEnum,
  ),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, { message: "Password is required" }),
    role: z.preprocess(
      (val) => (val === undefined || val === null ? undefined : val),
      roleEnum.optional(),
    ),
  })
  .strict();

export const requestOtpSchema = z
  .object({
    email: emailSchema,
    role: z.preprocess(
      (val) => (val === undefined || val === null ? undefined : val),
      roleEnum.optional(),
    ),
  })
  .strict();

export const loginWithOtpSchema = z
  .object({
    email: emailSchema,
    otp: otpSchema,
    role: z.preprocess(
      (val) => (val === undefined || val === null ? undefined : val),
      roleEnum.optional(),
    ),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: emailSchema,
    role: z.preprocess(
      (val) => (val === undefined || val === null ? undefined : val),
      roleEnum.optional(),
    ),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    email: emailSchema,
    otp: otpSchema,
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .strict();

export const validateSchema = <T extends ZodType<any>>(
  schema: T,
  data: unknown,
): z.infer<T> => {
  const result = schema.safeParse(data);

  if (!result.success) {
    const formattedErrors: Record<string, string> = {};

    result.error.issues.forEach((issue) => {
      const field = issue.path[0] as string;
      if (!field) return;

      if (issue.code === "invalid_type") {
        formattedErrors[field] = `${field} is required`;
      } else {
        formattedErrors[field] = issue.message;
      }
    });

    throw new ApiError(400, "Validation failed", {
      code: "VALIDATION_ERROR",
      details: formattedErrors,
    });
  }

  return result.data;
};

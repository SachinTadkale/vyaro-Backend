/**
 * Module: Company Auth.validation
 * Purpose: Implements the Company Auth.validation module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
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

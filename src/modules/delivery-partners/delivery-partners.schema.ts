/**
 * Module: Delivery Partners.schema
 * Purpose: Implements the Delivery Partners.schema module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { z, ZodType } from "zod";
import ApiError from "../../utils/apiError";
import { DELIVERY_PARTNER_ERROR_CODES } from "./delivery-partners.constants";
import { VehicleType } from "@prisma/client"; // ✅ IMPORTANT

const trimmedString = z.string().trim().min(1);

/* =========================
   CREATE PROFILE
========================= */

const vehicleTypes = Object.values(VehicleType) as [
  VehicleType,
  ...VehicleType[],
];

/**
 * Create Profile Schema.
 */
export const createProfileSchema = z.object({
  // ✅ ENUM VALIDATION (CRITICAL FIX)
  vehicleType: z.enum(vehicleTypes, {
    message: "Invalid vehicle type",
  }),

  vehicleNumber: trimmedString.min(5, "Vehicle number is required"),

  licenseNumber: trimmedString.min(5, "License number is required"),

  // 🔥 OPTIONAL BUT RECOMMENDED
  capacity: z.number().default(0),
});

/* =========================
   UPDATE AVAILABILITY
========================= */

/**
 * Update Availability Schema.
 */
export const updateAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});

/* =========================
   UPDATE LOCATION
========================= */

/**
 * Update Location Schema.
 */
export const updateLocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

/* =========================
   GLOBAL VALIDATOR
========================= */

/**
 * Validate Schema.
 */
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
      code: DELIVERY_PARTNER_ERROR_CODES.INVALID_INPUT,
      details: formattedErrors,
    });
  }

  return result.data;
};

/* =========================
   TYPES
========================= */

export type CreateProfileSchemaInput = z.infer<typeof createProfileSchema>;
export type UpdateAvailabilitySchemaInput = z.infer<
  typeof updateAvailabilitySchema
>;

import { z, ZodType } from "zod";
import ApiError from "../../utils/apiError";
import { DELIVERY_PARTNER_ERROR_CODES } from "./deliveryPartner.constants";

const trimmedString = z.string().trim().min(1);

export const createProfileSchema = z.object({
  vehicleType: trimmedString,
  licenseNumber: trimmedString,
});

export const updateAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});

export const validateSchema = <T>(schema: ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new ApiError(400, "Validation failed", {
      code: DELIVERY_PARTNER_ERROR_CODES.INVALID_INPUT,
      details: result.error.flatten(),
    });
  }

  return result.data;
};

export type CreateProfileSchemaInput = z.infer<typeof createProfileSchema>;
export type UpdateAvailabilitySchemaInput = z.infer<
  typeof updateAvailabilitySchema
>;

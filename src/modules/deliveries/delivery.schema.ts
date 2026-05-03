/**
 * Module: Delivery.schema
 * Purpose: Implements the Delivery.schema module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { DeliveryStatus } from "@prisma/client";
import { z, ZodType } from "zod";
import ApiError from "../../utils/apiError";

const uuid = z.string().uuid();
const nonEmptyString = z.string().trim().min(1);

/**
 * Assign Delivery Schema.
 */
export const assignDeliverySchema = z.object({
  orderId: uuid,
  deliveryPartnerId: uuid,
  idempotencyKey: nonEmptyString.max(100).optional(),
});

/**
 * Update Status Schema.
 */
export const updateStatusSchema = z.object({
  status: z.nativeEnum(DeliveryStatus),
});

/**
 * Delivery Id Param Schema.
 */
export const deliveryIdParamSchema = z.object({
  id: uuid,
});

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

export type AssignDeliverySchemaInput = z.infer<typeof assignDeliverySchema>;
export type UpdateStatusSchemaInput = z.infer<typeof updateStatusSchema>;

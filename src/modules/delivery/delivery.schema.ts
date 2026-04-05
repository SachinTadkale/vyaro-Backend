import { DeliveryStatus } from "@prisma/client";
import { z, ZodType } from "zod";
import ApiError from "../../utils/apiError";

const uuid = z.string().uuid();
const nonEmptyString = z.string().trim().min(1);

export const assignDeliverySchema = z.object({
  orderId: uuid,
  deliveryPartnerId: uuid,
  idempotencyKey: nonEmptyString.max(100).optional(),
});

export const updateStatusSchema = z.object({
  status: z.nativeEnum(DeliveryStatus),
});

export const deliveryIdParamSchema = z.object({
  id: uuid,
});

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

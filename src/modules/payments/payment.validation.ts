import { z, ZodType } from "zod";
import ApiError from "../../utils/apiError";

const nonEmptyString = z.string().trim().min(1);

export const createPaymentOrderSchema = z.object({
  orderId: nonEmptyString,
  idempotencyKey: nonEmptyString.max(100).optional(),
});

export const verifyPaymentSchema = z.object({
  orderId: nonEmptyString,
  razorpayOrderId: nonEmptyString,
  razorpayPaymentId: nonEmptyString,
  razorpaySignature: nonEmptyString,
  method: nonEmptyString.max(50).optional(),
});

export const paymentOrderParamSchema = z.object({
  orderId: nonEmptyString,
});

export const releasePaymentParamSchema = z.object({
  orderId: nonEmptyString,
});

export const releasePaymentSchema = z.object({
  releaseReference: nonEmptyString.max(100).optional(),
  notes: z.record(z.string(), z.string()).optional(),
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

export type CreatePaymentOrderInput = z.infer<typeof createPaymentOrderSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type ReleasePaymentInput = z.infer<typeof releasePaymentSchema>;

import { z, ZodType } from "zod";
import ApiError from "../../utils/apiError";
import { DISPUTE_RESOLUTION_ACTIONS } from "./dispute.constants";

const nonEmptyString = z.string().trim().min(1);

export const createDisputeSchema = z.object({
  orderId: nonEmptyString,
  reason: nonEmptyString.max(100),
  description: nonEmptyString.min(10).max(2000),
});

export const disputeIdParamSchema = z.object({
  id: nonEmptyString,
});

export const resolveDisputeSchema = z.object({
  resolutionAction: z.enum(DISPUTE_RESOLUTION_ACTIONS),
  resolutionNote: nonEmptyString.min(5).max(2000),
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

export type CreateDisputeInput = z.infer<typeof createDisputeSchema>;
export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>;

import { z, ZodType } from "zod";
import ApiError from "../../utils/apiError";

const positiveNumber = z.coerce.number().positive();

export const createOrderSchema = z.object({
  listingId: z.string().trim().min(1, "listingId is required"),
  quantity: positiveNumber,
});

export const orderIdParamSchema = z.object({
  id: z.string().trim().min(1, "Order id is required"),
});

export const companyOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.string().trim().min(1).optional(),
  sortBy: z.enum(["createdAt", "finalPrice"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const validateSchema = <T>(schema: ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);

  if (!result.success) {
    const message = result.error.issues.map((issue) => issue.message).join(", ");
    throw new ApiError(400, message || "Validation failed", {
      code: "VALIDATION_ERROR",
      details: result.error.flatten(),
    });
  }

  return result.data;
};

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CompanyOrdersQuery = z.infer<typeof companyOrdersQuerySchema>;

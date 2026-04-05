import { ListingStatus, ListingType } from "@prisma/client";
import { z, ZodType } from "zod";
import ApiError from "../../utils/apiError";

const positiveNumber = z.coerce.number().positive();

export const createListingSchema = z.object({
  productId: z.string().trim().min(1, "productId is required"),
  price: positiveNumber,
  quantity: positiveNumber,
  listingType: z.literal(ListingType.SELL),
});

export const marketplaceListingsQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  productId: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  location: z.string().trim().min(1).optional(),
  minPrice: positiveNumber.optional(),
  maxPrice: positiveNumber.optional(),
  minQuantity: positiveNumber.optional(),
  maxQuantity: positiveNumber.optional(),
  sortBy: z.enum(["price", "createdAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
}).refine(
  (data) =>
    data.minPrice === undefined ||
    data.maxPrice === undefined ||
    data.minPrice <= data.maxPrice,
  {
    message: "minPrice cannot be greater than maxPrice",
    path: ["minPrice"],
  },
).refine(
  (data) =>
    data.minQuantity === undefined ||
    data.maxQuantity === undefined ||
    data.minQuantity <= data.maxQuantity,
  {
    message: "minQuantity cannot be greater than maxQuantity",
    path: ["minQuantity"],
  },
);

export const listingIdParamSchema = z.object({
  id: z.string().trim().min(1, "Listing id is required"),
});

export const updateListingSchema = z.object({
  price: positiveNumber.optional(),
  quantity: positiveNumber.optional(),
  status: z.enum([ListingStatus.ACTIVE, ListingStatus.CLOSED]).optional(),
}).refine(
  (data) =>
    data.price !== undefined ||
    data.quantity !== undefined ||
    data.status !== undefined,
  {
    message: "At least one field is required for update",
  },
);

export const myListingsQuerySchema = z.object({
  status: z.nativeEnum(ListingStatus).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sortBy: z.enum(["price", "createdAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const validateSchema = <T>(schema: ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);

  if (!result.success) {
    const message = result.error.issues.map((issue) => issue.message).join(", ");
    throw new ApiError(400, message || "Validation failed");
  }

  return result.data;
};

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type MarketplaceListingsQuery = z.infer<typeof marketplaceListingsQuerySchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type MyListingsQuery = z.infer<typeof myListingsQuerySchema>;

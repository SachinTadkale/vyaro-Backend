import { ListingStatus, ListingType } from "@prisma/client";
import { z, ZodType } from "zod";
import ApiError from "../../utils/apiError";
import {
  DEFAULT_GEO_RADIUS_KM,
  DEFAULT_LISTINGS_LIMIT,
  DEFAULT_LISTINGS_PAGE,
  MAX_GEO_RADIUS_KM,
  MAX_LISTINGS_LIMIT,
} from "./marketplace.constants";

const positiveNumber = z.coerce.number().positive();
const latitudeSchema = z.coerce.number().min(-90).max(90);
const longitudeSchema = z.coerce.number().min(-180).max(180);

const geoFieldsSchema = z
  .object({
    lat: latitudeSchema.optional(),
    lng: longitudeSchema.optional(),
    radius: positiveNumber.max(MAX_GEO_RADIUS_KM).default(DEFAULT_GEO_RADIUS_KM),
  })
  .superRefine((data, ctx) => {
    const hasLat = data.lat !== undefined;
    const hasLng = data.lng !== undefined;

    if (hasLat !== hasLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "lat and lng must be provided together",
        path: hasLat ? ["lng"] : ["lat"],
      });
    }

    if (!hasLat && data.radius !== DEFAULT_GEO_RADIUS_KM) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "radius can only be used with lat and lng",
        path: ["radius"],
      });
    }
  });

export const createListingSchema = z
  .object({
    productId: z.string().trim().min(1, "productId is required"),
    price: positiveNumber,
    quantity: positiveNumber,
    minOrder: positiveNumber.optional(),
    latitude: latitudeSchema,
    longitude: longitudeSchema,
    listingType: z.literal(ListingType.SELL),
  })
  .refine(
    (data) => data.minOrder === undefined || data.minOrder <= data.quantity,
    {
      message: "minOrder cannot be greater than quantity",
      path: ["minOrder"],
    },
  );

export const marketplaceListingsQuerySchema = geoFieldsSchema.extend({
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
  page: z.coerce.number().int().positive().default(DEFAULT_LISTINGS_PAGE),
  limit: z.coerce.number().int().positive().max(MAX_LISTINGS_LIMIT).default(DEFAULT_LISTINGS_LIMIT),
})
  .refine(
    (data) =>
      data.minPrice === undefined ||
      data.maxPrice === undefined ||
      data.minPrice <= data.maxPrice,
    {
      message: "minPrice cannot be greater than maxPrice",
      path: ["minPrice"],
    },
  )
  .refine(
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

export const listingGeoQuerySchema = geoFieldsSchema;

export const updateListingSchema = z
  .object({
    price: positiveNumber.optional(),
    quantity: positiveNumber.optional(),
    minOrder: positiveNumber.optional(),
    latitude: latitudeSchema.optional(),
    longitude: longitudeSchema.optional(),
    status: z.enum([ListingStatus.ACTIVE, ListingStatus.CLOSED]).optional(),
  })
  .superRefine((data, ctx) => {
    const hasLatitude = data.latitude !== undefined;
    const hasLongitude = data.longitude !== undefined;

    if (hasLatitude !== hasLongitude) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "latitude and longitude must be updated together",
        path: hasLatitude ? ["longitude"] : ["latitude"],
      });
    }

    if (
      data.minOrder !== undefined &&
      data.quantity !== undefined &&
      data.minOrder > data.quantity
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "minOrder cannot be greater than quantity",
        path: ["minOrder"],
      });
    }

    if (
      data.price === undefined &&
      data.quantity === undefined &&
      data.minOrder === undefined &&
      data.latitude === undefined &&
      data.longitude === undefined &&
      data.status === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field is required for update",
      });
    }
  });

export const myListingsQuerySchema = z.object({
  status: z.nativeEnum(ListingStatus).optional(),
  page: z.coerce.number().int().positive().default(DEFAULT_LISTINGS_PAGE),
  limit: z.coerce.number().int().positive().max(MAX_LISTINGS_LIMIT).default(DEFAULT_LISTINGS_LIMIT),
  sortBy: z.enum(["price", "createdAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const validateSchema = <T>(schema: ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);

  if (!result.success) {
    const message = result.error.issues.map((issue) => issue.message).join(", ");
    const code = message.includes("lat") || message.includes("lng")
      ? "INVALID_COORDINATES"
      : message.includes("radius")
        ? "RADIUS_TOO_LARGE"
        : undefined;

    throw new ApiError(400, message || "Validation failed", {
      ...(code ? { code } : {}),
    });
  }

  return result.data;
};

export const isGeoMode = <T extends { lat?: number; lng?: number }>(
  query: T,
): query is T & { lat: number; lng: number } =>
  query.lat !== undefined && query.lng !== undefined;

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type MarketplaceListingsQuery = z.infer<typeof marketplaceListingsQuerySchema>;
export type ListingGeoQuery = z.infer<typeof listingGeoQuerySchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type MyListingsQuery = z.infer<typeof myListingsQuerySchema>;

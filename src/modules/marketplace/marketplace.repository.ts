import { ListingStatus, ListingType, Prisma } from "@prisma/client";
import prisma from "../../config/prisma";
import { getBoundingBox, haversineDistanceSql } from "./marketplace.geo";
import {
  MarketplaceListingsQuery,
  MyListingsQuery,
} from "./marketplace.schema";

export const listingSelection = {
  listingId: true,
  sellerId: true,
  productId: true,
  price: true,
  quantity: true,
  minOrder: true,
  latitude: true,
  longitude: true,
  listingType: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  product: {
    select: {
      productId: true,
      productName: true,
      category: true,
      unit: true,
      productImage: true,
    },
  },
  seller: {
    select: {
      user_id: true,
      name: true,
      address: true,
      farmDetails: {
        select: {
          state: true,
          district: true,
          village: true,
          pincode: true,
        },
      },
    },
  },
};

export type ListingRecord = {
  listingId: string;
  sellerId: string;
  productId: string;
  price: number;
  quantity: number;
  minOrder: number | null;
  latitude: number | null;
  longitude: number | null;
  listingType: ListingType;
  status: ListingStatus;
  createdAt: Date;
  updatedAt: Date;
  product: {
    productId: string;
    productName: string;
    category: string;
    unit: string;
    productImage: string | null;
  };
  seller: {
    user_id: string;
    name: string;
    address: string;
    farmDetails: {
      state: string | null;
      district: string | null;
      village: string | null;
      pincode: string | null;
    } | null;
  };
};

export type NearbyListingRow = {
  listingId: string;
  sellerId: string;
  productId: string;
  price: number;
  quantity: number;
  minOrder: number | null;
  latitude: number | null;
  longitude: number | null;
  listingType: ListingType;
  status: ListingStatus;
  createdAt: Date;
  updatedAt: Date;
  productName: string;
  productCategory: string;
  productUnit: string;
  productImage: string | null;
  sellerName: string;
  sellerAddress: string;
  sellerState: string | null;
  sellerDistrict: string | null;
  sellerVillage: string | null;
  sellerPincode: string | null;
  distanceKm: number;
};

const buildMarketplaceWhere = (
  query: MarketplaceListingsQuery,
): Prisma.MarketListingWhereInput => {
  const where: Prisma.MarketListingWhereInput = {
    status: ListingStatus.ACTIVE,
    listingType: ListingType.SELL,
  };

  if (query.productId) {
    where.productId = query.productId;
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.price = {
      gte: query.minPrice,
      lte: query.maxPrice,
    };
  }

  if (query.minQuantity !== undefined || query.maxQuantity !== undefined) {
    where.quantity = {
      gte: query.minQuantity,
      lte: query.maxQuantity,
    };
  }

  if (query.search || query.category) {
    where.product = {
      is: {
        ...(query.search
          ? {
              productName: {
                contains: query.search,
                mode: "insensitive",
              },
            }
          : {}),
        ...(query.category
          ? {
              category: {
                equals: query.category,
                mode: "insensitive",
              },
            }
          : {}),
      },
    };
  }

  if (query.location) {
    where.seller = {
      is: {
        OR: [
          {
            address: {
              contains: query.location,
              mode: "insensitive",
            },
          },
          {
            farmDetails: {
              is: {
                state: {
                  contains: query.location,
                  mode: "insensitive",
                },
              },
            },
          },
          {
            farmDetails: {
              is: {
                district: {
                  contains: query.location,
                  mode: "insensitive",
                },
              },
            },
          },
          {
            farmDetails: {
              is: {
                village: {
                  contains: query.location,
                  mode: "insensitive",
                },
              },
            },
          },
          {
            farmDetails: {
              is: {
                pincode: {
                  contains: query.location,
                  mode: "insensitive",
                },
              },
            },
          },
        ],
      },
    };
  }

  return where;
};

const buildGeoFilters = (query: MarketplaceListingsQuery) => {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`"ml"."status" = ${ListingStatus.ACTIVE}::"ListingStatus"`,
    Prisma.sql`"ml"."listingType" = ${ListingType.SELL}::"ListingType"`,
    Prisma.sql`"ml"."latitude" IS NOT NULL`,
    Prisma.sql`"ml"."longitude" IS NOT NULL`,
  ];

  if (query.productId) {
    conditions.push(Prisma.sql`"ml"."productId" = ${query.productId}`);
  }

  if (query.minPrice !== undefined) {
    conditions.push(Prisma.sql`"ml"."price" >= ${query.minPrice}`);
  }

  if (query.maxPrice !== undefined) {
    conditions.push(Prisma.sql`"ml"."price" <= ${query.maxPrice}`);
  }

  if (query.minQuantity !== undefined) {
    conditions.push(Prisma.sql`"ml"."quantity" >= ${query.minQuantity}`);
  }

  if (query.maxQuantity !== undefined) {
    conditions.push(Prisma.sql`"ml"."quantity" <= ${query.maxQuantity}`);
  }

  if (query.search) {
    conditions.push(
      Prisma.sql`"p"."productName" ILIKE ${`%${query.search}%`}`,
    );
  }

  if (query.category) {
    conditions.push(Prisma.sql`"p"."category" ILIKE ${query.category}`);
  }

  if (query.location) {
    const pattern = `%${query.location}%`;
    conditions.push(
      Prisma.sql`(
        "u"."address" ILIKE ${pattern}
        OR COALESCE("fd"."state", '') ILIKE ${pattern}
        OR COALESCE("fd"."district", '') ILIKE ${pattern}
        OR COALESCE("fd"."village", '') ILIKE ${pattern}
        OR COALESCE("fd"."pincode", '') ILIKE ${pattern}
      )`,
    );
  }

  return conditions;
};

const joinGeoFilters = (conditions: Prisma.Sql[]) =>
  Prisma.join(conditions, " AND ");

export const findProductOwnedBySeller = (productId: string, sellerId: string) =>
  prisma.product.findFirst({
    where: {
      productId,
      userId: sellerId,
    },
    select: {
      productId: true,
    },
  });

export const createListingRecord = (
  data: Prisma.MarketListingUncheckedCreateInput,
) =>
  prisma.marketListing.create({
    data: data as never,
    select: listingSelection as never,
  }) as unknown as Promise<ListingRecord>;

export const findMarketplaceListings = async (
  query: MarketplaceListingsQuery,
) => {
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;
  const where = buildMarketplaceWhere(query);

  const [listings, total] = await prisma.$transaction([
    prisma.marketListing.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [query.sortBy]: query.order,
      },
      select: listingSelection as never,
    }),
    prisma.marketListing.count({ where }),
  ]);

  return { listings: listings as ListingRecord[], total };
};

export const findNearbyMarketplaceListings = async (
  query: MarketplaceListingsQuery & { lat: number; lng: number },
) => {
  const page = query.page;
  const limit = query.limit;
  const offset = (page - 1) * limit;
  const radiusKm = query.radius;
  const box = getBoundingBox(query.lat, query.lng, radiusKm);
  const distanceSql = haversineDistanceSql(query.lat, query.lng);
  const baseFilters = buildGeoFilters(query);
  const boundingBoxFilters = [
    ...baseFilters,
    Prisma.sql`"ml"."latitude" BETWEEN ${box.minLat} AND ${box.maxLat}`,
    Prisma.sql`"ml"."longitude" BETWEEN ${box.minLng} AND ${box.maxLng}`,
  ];

  const whereClause = joinGeoFilters(boundingBoxFilters);

  const listings = await prisma.$queryRaw<NearbyListingRow[]>(Prisma.sql`
    SELECT
      "ml"."listingId" AS "listingId",
      "ml"."sellerId" AS "sellerId",
      "ml"."productId" AS "productId",
      "ml"."price" AS "price",
      "ml"."quantity" AS "quantity",
      "ml"."minOrder" AS "minOrder",
      "ml"."latitude" AS "latitude",
      "ml"."longitude" AS "longitude",
      "ml"."listingType" AS "listingType",
      "ml"."status" AS "status",
      "ml"."createdAt" AS "createdAt",
      "ml"."updatedAt" AS "updatedAt",
      "p"."productName" AS "productName",
      "p"."category" AS "productCategory",
      "p"."unit" AS "productUnit",
      "p"."productImage" AS "productImage",
      "u"."name" AS "sellerName",
      "u"."address" AS "sellerAddress",
      "fd"."state" AS "sellerState",
      "fd"."district" AS "sellerDistrict",
      "fd"."village" AS "sellerVillage",
      "fd"."pincode" AS "sellerPincode",
      ${distanceSql} AS "distanceKm"
    FROM "MarketListing" "ml"
    INNER JOIN "Product" "p" ON "p"."productId" = "ml"."productId"
    INNER JOIN "User" "u" ON "u"."user_id" = "ml"."sellerId"
    LEFT JOIN "FarmDetails" "fd" ON "fd"."userId" = "u"."user_id"
    WHERE ${whereClause}
      AND ${distanceSql} <= ${radiusKm}
    ORDER BY "distanceKm" ASC, "ml"."createdAt" DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  const totalRows = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS "total"
    FROM "MarketListing" "ml"
    INNER JOIN "Product" "p" ON "p"."productId" = "ml"."productId"
    INNER JOIN "User" "u" ON "u"."user_id" = "ml"."sellerId"
    LEFT JOIN "FarmDetails" "fd" ON "fd"."userId" = "u"."user_id"
    WHERE ${whereClause}
      AND ${distanceSql} <= ${radiusKm}
  `);

  return {
    listings,
    total: Number(totalRows[0]?.total ?? 0),
  };
};

export const findListingById = (listingId: string) =>
  prisma.marketListing.findUnique({
    where: { listingId },
    select: listingSelection as never,
  }) as Promise<ListingRecord | null>;

export const updateListingRecord = (
  listingId: string,
  data: Prisma.MarketListingUpdateInput,
) =>
  prisma.marketListing.update({
    where: { listingId },
    data,
    select: listingSelection as never,
  }) as unknown as Promise<ListingRecord>;

export const findListingOwnership = (listingId: string) =>
  prisma.marketListing.findUnique({
    where: { listingId },
    select: {
      listingId: true,
      sellerId: true,
      status: true,
      quantity: true,
    },
  });

export const countSellerListings = async (
  sellerId: string,
  query: MyListingsQuery,
) => {
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;
  const where: Prisma.MarketListingWhereInput = {
    sellerId,
    ...(query.status ? { status: query.status } : {}),
  };

  const [listings, total] = await prisma.$transaction([
    prisma.marketListing.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [query.sortBy]: query.order,
      },
      select: listingSelection as never,
    }),
    prisma.marketListing.count({ where }),
  ]);

  return { listings: listings as ListingRecord[], total };
};

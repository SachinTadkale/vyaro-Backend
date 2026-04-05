import {
  ListingStatus,
  ListingType,
  Prisma,
  VerificationStatus,
} from "@prisma/client";
import prisma from "../../config/prisma";
import ApiError from "../../utils/apiError";
import {
  CreateListingInput,
  MarketplaceListingsQuery,
  MyListingsQuery,
  UpdateListingInput,
} from "./marketplace.validator";

const listingSelection = {
  listingId: true,
  price: true,
  quantity: true,
  minOrder: true,
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
} satisfies Prisma.MarketListingSelect;

type ListingRecord = Prisma.MarketListingGetPayload<{
  select: typeof listingSelection;
}>;

const buildLocation = (listing: ListingRecord) => ({
  address: listing.seller.address,
  state: listing.seller.farmDetails?.state ?? null,
  district: listing.seller.farmDetails?.district ?? null,
  village: listing.seller.farmDetails?.village ?? null,
  pincode: listing.seller.farmDetails?.pincode ?? null,
});

const formatListing = (listing: ListingRecord) => ({
  id: listing.listingId,
  product: {
    id: listing.product.productId,
    name: listing.product.productName,
    category: listing.product.category,
    unit: listing.product.unit,
    image: listing.product.productImage,
  },
  seller: {
    id: listing.seller.user_id,
    name: listing.seller.name,
    rating: null,
  },
  price: listing.price,
  quantity: listing.quantity,
  minOrder: listing.minOrder,
  listingType: listing.listingType,
  status: listing.status,
  location: buildLocation(listing),
  createdAt: listing.createdAt,
  updatedAt: listing.updatedAt,
});

const ensureVerifiedSeller = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: {
      user_id: true,
      verificationStatus: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.verificationStatus !== VerificationStatus.VERIFIED) {
    throw new ApiError(403, "Seller must be verified to create listings");
  }
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

export const createListing = async (
  sellerId: string,
  data: CreateListingInput,
) => {
  await ensureVerifiedSeller(sellerId);

  const product = await prisma.product.findFirst({
    where: {
      productId: data.productId,
      userId: sellerId,
    },
    select: {
      productId: true,
    },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const listing = await prisma.marketListing.create({
    data: {
      sellerId,
      productId: data.productId,
      price: data.price,
      quantity: data.quantity,
      listingType: data.listingType,
      status: ListingStatus.ACTIVE,
    },
    select: listingSelection,
  });

  return {
    message: "Listing created successfully",
    listing: formatListing(listing),
  };
};

export const getMarketplaceListings = async (
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
      select: listingSelection,
    }),
    prisma.marketListing.count({ where }),
  ]);

  return {
    data: listings.map(formatListing),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getListingById = async (
  listingId: string,
  actor: { actorType?: "USER" | "COMPANY"; userId: string },
) => {
  const listing = await prisma.marketListing.findUnique({
    where: { listingId },
    select: listingSelection,
  });

  if (!listing) {
    throw new ApiError(404, "Listing not found");
  }

  const canViewInactiveListing =
    actor.actorType === "USER" && listing.seller.user_id === actor.userId;

  if (
    !canViewInactiveListing &&
    (listing.status !== ListingStatus.ACTIVE ||
      listing.listingType !== ListingType.SELL)
  ) {
    throw new ApiError(404, "Listing not found");
  }

  return formatListing(listing);
};

export const updateListing = async (
  listingId: string,
  sellerId: string,
  data: UpdateListingInput,
) => {
  const listing = await prisma.marketListing.findUnique({
    where: { listingId },
    select: {
      listingId: true,
      sellerId: true,
    },
  });

  if (!listing || listing.sellerId !== sellerId) {
    throw new ApiError(404, "Listing not found");
  }

  const updatedListing = await prisma.marketListing.update({
    where: { listingId },
    data: {
      ...(data.price !== undefined ? { price: data.price } : {}),
      ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
    select: listingSelection,
  });

  return {
    message: "Listing updated successfully",
    listing: formatListing(updatedListing),
  };
};

export const deleteListing = async (listingId: string, sellerId: string) => {
  const listing = await prisma.marketListing.findUnique({
    where: { listingId },
    select: {
      listingId: true,
      sellerId: true,
      status: true,
    },
  });

  if (!listing || listing.sellerId !== sellerId) {
    throw new ApiError(404, "Listing not found");
  }

  if (listing.status === ListingStatus.CANCELLED) {
    throw new ApiError(400, "Listing already cancelled");
  }

  await prisma.marketListing.update({
    where: { listingId },
    data: {
      status: ListingStatus.CANCELLED,
    },
  });

  return {
    message: "Listing cancelled successfully",
  };
};

export const getMyListings = async (
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
      select: listingSelection,
    }),
    prisma.marketListing.count({ where }),
  ]);

  return {
    data: listings.map(formatListing),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

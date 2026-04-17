import { ListingStatus, ListingType, VerificationStatus } from "@prisma/client";
import prisma from "../../config/prisma";
import ApiError from "../../utils/apiError";
import { calculateHaversineDistanceKm } from "./marketplace.geo";
import {
  ListingRecord,
  NearbyListingRow,
  countSellerListings,
  createListingRecord,
  findListingById,
  findListingOwnership,
  findMarketplaceListings,
  findNearbyMarketplaceListings,
  findProductOwnedBySeller,
  updateListingRecord,
} from "./marketplace.repository";
import {
  CreateListingInput,
  isGeoMode,
  ListingGeoQuery,
  MarketplaceListingsQuery,
  MyListingsQuery,
  UpdateListingInput,
} from "./marketplace.schema";

const buildLocation = (listing: {
  seller: {
    address: string;
    farmDetails?: {
      state: string | null;
      district: string | null;
      village: string | null;
      pincode: string | null;
    } | null;
  };
}) => ({
  address: listing.seller.address,
  state: listing.seller.farmDetails?.state ?? null,
  district: listing.seller.farmDetails?.district ?? null,
  village: listing.seller.farmDetails?.village ?? null,
  pincode: listing.seller.farmDetails?.pincode ?? null,
});

const formatListing = (
  listing: ListingRecord,
  options?: { distanceKm?: number | null },
) => ({
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
  ...(options?.distanceKm !== undefined && options.distanceKm !== null
    ? { distanceKm: Number(options.distanceKm.toFixed(2)) }
    : {}),
  createdAt: listing.createdAt,
  updatedAt: listing.updatedAt,
});

const formatNearbyListing = (listing: NearbyListingRow) => ({
  id: listing.listingId,
  product: {
    id: listing.productId,
    name: listing.productName,
    category: listing.productCategory,
    unit: listing.productUnit,
    image: listing.productImage,
  },
  seller: {
    id: listing.sellerId,
    name: listing.sellerName,
    rating: null,
  },
  price: listing.price,
  quantity: listing.quantity,
  minOrder: listing.minOrder,
  listingType: listing.listingType,
  status: listing.status,
  location: {
    address: listing.sellerAddress,
    state: listing.sellerState,
    district: listing.sellerDistrict,
    village: listing.sellerVillage,
    pincode: listing.sellerPincode,
  },
  distanceKm: Number(listing.distanceKm.toFixed(2)),
  createdAt: listing.createdAt,
  updatedAt: listing.updatedAt,
});

const buildPagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

const ensureVerifiedSeller = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: {
      user_id: true,
      name: true,
      email: true,
      verificationStatus: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.verificationStatus !== VerificationStatus.VERIFIED) {
    throw new ApiError(403, "Seller must be verified to create listings");
  }

  return user;
};

export const createListing = async (
  sellerId: string,
  data: CreateListingInput,
) => {
  const seller = await ensureVerifiedSeller(sellerId);

  const product = await findProductOwnedBySeller(data.productId, sellerId);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const listing = await createListingRecord({
    sellerId,
    productId: data.productId,
    price: data.price,
    quantity: data.quantity,
    minOrder: data.minOrder,
    latitude: data.latitude,
    longitude: data.longitude,
    listingType: data.listingType,
    status: ListingStatus.ACTIVE,
  } as never);

  return {
    message: "Listing created successfully",
    listing: formatListing(listing),
    notificationPayload: seller.email
      ? {
          user: {
            id: seller.user_id,
            name: seller.name,
            email: seller.email,
          },
          listing: {
            id: listing.listingId,
            productName: listing.product.productName,
            category: listing.product.category,
            unit: listing.product.unit,
            price: listing.price,
            quantity: listing.quantity,
            status: listing.status,
          },
        }
      : undefined,
  };
};

export const getNormalListings = async (query: MarketplaceListingsQuery) => {
  const { listings, total } = await findMarketplaceListings(query);

  return {
    mode: "normal" as const,
    data: listings.map((listing) => formatListing(listing)),
    pagination: buildPagination(query.page, query.limit, total),
  };
};

export const getNearbyListings = async (
  query: MarketplaceListingsQuery & { lat: number; lng: number },
) => {
  const { listings, total } = await findNearbyMarketplaceListings(query);

  return {
    mode: "geo" as const,
    data: listings.map(formatNearbyListing),
    pagination: buildPagination(query.page, query.limit, total),
  };
};

export const getMarketplaceListings = async (
  query: MarketplaceListingsQuery,
) => {
  if (isGeoMode(query)) {
    return getNearbyListings(query as MarketplaceListingsQuery & {
      lat: number;
      lng: number;
    });
  }

  return getNormalListings(query);
};

export const getListingById = async (
  listingId: string,
  actor: { actorType?: "USER" | "COMPANY"; userId: string },
  geoQuery?: ListingGeoQuery,
) => {
  const listing = await findListingById(listingId);

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

  if (
    geoQuery &&
    isGeoMode(geoQuery) &&
    listing.latitude !== null &&
    listing.longitude !== null
  ) {
    const distanceKm = calculateHaversineDistanceKm(
      geoQuery.lat,
      geoQuery.lng,
      listing.latitude,
      listing.longitude,
    );

    return formatListing(listing, { distanceKm });
  }

  return formatListing(listing);
};

export const updateListing = async (
  listingId: string,
  sellerId: string,
  data: UpdateListingInput,
) => {
  const listing = await findListingOwnership(listingId);

  if (!listing || listing.sellerId !== sellerId) {
    throw new ApiError(404, "Listing not found");
  }

  const nextQuantity = data.quantity ?? listing.quantity;
  const nextMinOrder = data.minOrder;

  if (nextMinOrder !== undefined && nextMinOrder > nextQuantity) {
    throw new ApiError(400, "minOrder cannot be greater than quantity");
  }

  const updatedListing = await updateListingRecord(listingId, {
    ...(data.price !== undefined ? { price: data.price } : {}),
    ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
    ...(data.minOrder !== undefined ? { minOrder: data.minOrder } : {}),
    ...(data.latitude !== undefined ? { latitude: data.latitude } : {}),
    ...(data.longitude !== undefined ? { longitude: data.longitude } : {}),
    ...(data.status !== undefined ? { status: data.status } : {}),
  });

  return {
    message: "Listing updated successfully",
    listing: formatListing(updatedListing),
  };
};

export const deleteListing = async (listingId: string, sellerId: string) => {
  const listing = await findListingOwnership(listingId);

  if (!listing || listing.sellerId !== sellerId) {
    throw new ApiError(404, "Listing not found");
  }

  if (listing.status === ListingStatus.CANCELLED) {
    throw new ApiError(400, "Listing already cancelled");
  }

  await updateListingRecord(listingId, {
    status: ListingStatus.CANCELLED,
  });

  return {
    message: "Listing cancelled successfully",
  };
};

export const getMyListings = async (
  sellerId: string,
  query: MyListingsQuery,
) => {
  const { listings, total } = await countSellerListings(sellerId, query);

  return {
    data: listings.map((listing) => formatListing(listing)),
    pagination: buildPagination(query.page, query.limit, total),
  };
};

import {
  ListingStatus,
  ListingType,
  OrderStatus,
  Prisma,
} from "@prisma/client";
import prisma from "../../config/prisma";

export const orderDetailsSelect = {
  orderId: true,
  listingId: true,
  companyId: true,
  sellerId: true,
  productId: true,
  quantity: true,
  unitPrice: true,
  finalPrice: true,
  productName: true,
  productCategory: true,
  productUnit: true,
  orderStatus: true,
  paymentStatus: true,
  farmerAccepted: true,
  createdAt: true,
  updatedAt: true,
  listing: {
    select: {
      listingId: true,
      status: true,
      quantity: true,
      product: {
        select: {
          productImage: true,
        },
      },
    },
  },
  company: {
    select: {
      companyId: true,
      companyName: true,
      email: true,
      hqLocation: true,
    },
  },
} satisfies Prisma.OrderSelect;

export type OrderDetailsRecord = Prisma.OrderGetPayload<{
  select: typeof orderDetailsSelect;
}>;

export const findVerifiedCompanyById = (companyId: string) => {
  return prisma.company.findUnique({
    where: { companyId },
    select: {
      companyId: true,
      verification: true,
    },
  });
};

export const findUserById = (userId: string) => {
  return prisma.user.findUnique({
    where: { user_id: userId },
    select: {
      user_id: true,
      name: true,
      email: true,
    },
  });
};

export const findCompanyOrderById = (orderId: string, companyId: string) => {
  return prisma.order.findFirst({
    where: {
      orderId,
      companyId,
    },
    select: orderDetailsSelect,
  });
};

export const findFarmerOrderById = (orderId: string, sellerId: string) => {
  return prisma.order.findFirst({
    where: {
      orderId,
      sellerId,
    },
    select: orderDetailsSelect,
  });
};

export const findCompanyOrders = async ({
  companyId,
  status,
  search,
  skip,
  take,
  sortBy,
  order,
}: {
  companyId: string;
  status?: OrderStatus;
  search?: string;
  skip: number;
  take: number;
  sortBy: "createdAt" | "finalPrice";
  order: "asc" | "desc";
}) => {
  const where: Prisma.OrderWhereInput = {
    companyId,
    ...(status ? { orderStatus: status } : {}),
    ...(search
      ? {
          OR: [
            { productName: { contains: search, mode: "insensitive" } },
            {
              company: {
                is: { companyName: { contains: search, mode: "insensitive" } },
              },
            },
          ],
        }
      : {}),
  };

  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      skip,
      take,
      orderBy: {
        [sortBy]: order,
      },
      select: orderDetailsSelect,
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, total };
};

export const findFarmerOrders = async ({
  sellerId,
  status,
  search,
  skip,
  take,
  sortBy,
  order,
}: {
  sellerId: string;
  status?: OrderStatus;
  search?: string;
  skip: number;
  take: number;
  sortBy: "createdAt" | "finalPrice";
  order: "asc" | "desc";
}) => {
  const where: Prisma.OrderWhereInput = {
    sellerId,
    ...(status ? { orderStatus: status } : {}),
    ...(search
      ? {
          OR: [
            { productName: { contains: search, mode: "insensitive" } },
            {
              company: {
                is: { companyName: { contains: search, mode: "insensitive" } },
              },
            },
          ],
        }
      : {}),
  };

  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      skip,
      take,
      orderBy: {
        [sortBy]: order,
      },
      select: orderDetailsSelect,
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, total };
};

export const createOrderWithReservation = async ({
  companyId,
  listingId,
  quantity,
}: {
  companyId: string;
  listingId: string;
  quantity: number;
}) => {
  return prisma.$transaction(async (tx) => {
    const listing = await tx.marketListing.findUnique({
      where: { listingId },
      select: {
        listingId: true,
        sellerId: true,
        productId: true,
        price: true,
        quantity: true,
        minOrder: true,
        status: true,
        listingType: true,
        product: {
          select: {
            productId: true,
            productName: true,
            category: true,
            unit: true,
            productImage: true,
          },
        },
      },
    });

    if (!listing) {
      return { error: "LISTING_NOT_FOUND" } as const;
    }

    if (
      listing.status !== ListingStatus.ACTIVE ||
      listing.listingType !== ListingType.SELL
    ) {
      return { error: "LISTING_UNAVAILABLE" } as const;
    }

    if (listing.minOrder && quantity < listing.minOrder) {
      return {
        error: "MIN_ORDER_NOT_MET",
        minOrder: listing.minOrder,
      } as const;
    }

    if (quantity > listing.quantity) {
      return {
        error: "QUANTITY_OVERFLOW",
        availableQuantity: listing.quantity,
      } as const;
    }

    const newRemainingQuantity = listing.quantity - quantity;
    const reservationResult = await tx.marketListing.updateMany({
      where: {
        listingId,
        status: ListingStatus.ACTIVE,
        listingType: ListingType.SELL,
        quantity: {
          gte: quantity,
        },
      },
      data: {
        quantity: {
          decrement: quantity,
        },
        ...(newRemainingQuantity === 0
          ? {
              status: ListingStatus.CLOSED,
            }
          : {}),
      },
    });

    if (reservationResult.count === 0) {
      const latestListing = await tx.marketListing.findUnique({
        where: { listingId },
        select: {
          quantity: true,
          status: true,
        },
      });

      return {
        error: "CONCURRENT_UPDATE",
        availableQuantity:
          latestListing?.status === ListingStatus.ACTIVE
            ? latestListing.quantity
            : 0,
      } as const;
    }

    const order = await tx.order.create({
      data: {
        listingId: listing.listingId,
        companyId,
        sellerId: listing.sellerId,
        productId: listing.productId,
        quantity,
        unitPrice: listing.price,
        finalPrice: listing.price * quantity,
        productName: listing.product.productName,
        productCategory: listing.product.category,
        productUnit: listing.product.unit,
      },
      select: orderDetailsSelect,
    });

    return { order } as const;
  });
};

export const updateOrderStatus = async ({
  orderId,
  companyId,
  sellerId,
  currentStatuses,
  nextStatus,
  farmerAccepted,
  restoreQuantity,
}: {
  orderId: string;
  companyId?: string;
  sellerId?: string;
  currentStatuses: OrderStatus[];
  nextStatus: OrderStatus;
  farmerAccepted?: boolean;
  restoreQuantity?: boolean;
}) => {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        orderId,
        ...(companyId ? { companyId } : {}),
        ...(sellerId ? { sellerId } : {}),
      },
      select: {
        orderId: true,
        listingId: true,
        quantity: true,
        orderStatus: true,
      },
    });

    if (!order) {
      return { error: "ORDER_NOT_FOUND" } as const;
    }

    if (!currentStatuses.includes(order.orderStatus)) {
      return {
        error: "INVALID_STATUS_TRANSITION",
        currentStatus: order.orderStatus,
      } as const;
    }

    await tx.order.update({
      where: { orderId },
      data: {
        orderStatus: nextStatus,
        ...(farmerAccepted !== undefined ? { farmerAccepted } : {}),
      },
    });

    if (restoreQuantity) {
      const currentListing = await tx.marketListing.findUnique({
        where: { listingId: order.listingId },
        select: {
          quantity: true,
          status: true,
        },
      });

      const nextListingStatus =
        currentListing?.status === ListingStatus.CLOSED &&
        currentListing.quantity === 0
          ? ListingStatus.ACTIVE
          : currentListing?.status;

      await tx.marketListing.update({
        where: { listingId: order.listingId },
        data: {
          quantity: {
            increment: order.quantity,
          },
          ...(nextListingStatus ? { status: nextListingStatus } : {}),
        },
      });
    }

    const updatedOrder = await tx.order.findUnique({
      where: { orderId },
      select: orderDetailsSelect,
    });

    return { order: updatedOrder! } as const;
  });
};

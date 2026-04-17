import { OrderStatus, VerificationStatus } from "@prisma/client";
import ApiError from "../../utils/apiError";
import {
  createOrderWithReservation,
  findCompanyOrderById,
  findCompanyOrders,
  findFarmerOrderById,
  findVerifiedCompanyById,
  OrderDetailsRecord,
  updateOrderStatus,
} from "./order.repository";
import { CompanyOrdersQuery, CreateOrderInput } from "./order.validation";

const formatOrder = (order: OrderDetailsRecord) => ({
  id: order.orderId,
  listingId: order.listingId,
  company: {
    id: order.company.companyId,
    name: order.company.companyName,
    email: order.company.email,
    hqLocation: order.company.hqLocation,
  },
  sellerId: order.sellerId,
  product: {
    id: order.productId,
    name: order.productName,
    category: order.productCategory,
    unit: order.productUnit,
    image: order.listing.product.productImage,
  },
  snapshot: {
    unitPrice: order.unitPrice,
    quantity: order.quantity,
    finalPrice: order.finalPrice,
  },
  orderStatus: order.orderStatus,
  paymentStatus: order.paymentStatus,
  farmerAccepted: order.farmerAccepted,
  listingState: {
    id: order.listing.listingId,
    status: order.listing.status,
    remainingQuantity: order.listing.quantity,
  },
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

const ensureCompanyCanOrder = async (companyId?: string) => {
  if (!companyId) {
    throw new ApiError(401, "Unauthorized", {
      code: "UNAUTHORIZED",
    });
  }

  const company = await findVerifiedCompanyById(companyId);

  if (!company) {
    throw new ApiError(401, "Unauthorized", {
      code: "COMPANY_NOT_FOUND",
    });
  }

  if (company.verification !== VerificationStatus.VERIFIED) {
    throw new ApiError(403, "Company verification required to place orders", {
      code: "COMPANY_NOT_VERIFIED",
    });
  }
};

const parseOrderStatus = (status?: string) => {
  if (!status) {
    return undefined;
  }

  if (!(status in OrderStatus)) {
    throw new ApiError(400, "Invalid order status filter", {
      code: "INVALID_ORDER_STATUS",
    });
  }

  return OrderStatus[status as keyof typeof OrderStatus];
};

export const createOrder = async (
  companyId: string | undefined,
  payload: CreateOrderInput,
) => {
  await ensureCompanyCanOrder(companyId);

  const result = await createOrderWithReservation({
    companyId: companyId!,
    listingId: payload.listingId,
    quantity: payload.quantity,
  });

  if ("error" in result) {
    switch (result.error) {
      case "LISTING_NOT_FOUND":
        throw new ApiError(404, "Listing not found", {
          code: "LISTING_NOT_FOUND",
        });
      case "LISTING_UNAVAILABLE":
        throw new ApiError(400, "Listing is not available for ordering", {
          code: "LISTING_UNAVAILABLE",
        });
      case "MIN_ORDER_NOT_MET":
        throw new ApiError(
          400,
          `Minimum order quantity is ${result.minOrder}`,
          {
            code: "MIN_ORDER_NOT_MET",
            details: { minOrder: result.minOrder },
          },
        );
      case "QUANTITY_OVERFLOW":
      case "CONCURRENT_UPDATE":
        throw new ApiError(409, "Requested quantity is no longer available", {
          code: "QUANTITY_OVERFLOW",
          details: {
            availableQuantity: result.availableQuantity,
          },
        });
    }
  }

  return {
    message: "Order created successfully",
    order: formatOrder(result.order),
    notificationPayload: {
      company: {
        id: result.order.company.companyId,
        name: result.order.company.companyName,
        email: result.order.company.email,
        hqLocation: result.order.company.hqLocation,
      },
      order: {
        id: result.order.orderId,
        status: result.order.orderStatus,
        paymentStatus: result.order.paymentStatus,
        productName: result.order.productName,
        productUnit: result.order.productUnit,
        quantity: result.order.quantity,
        totalAmount: result.order.finalPrice,
      },
    },
  };
};

export const getCompanyOrders = async (
  companyId: string | undefined,
  query: CompanyOrdersQuery,
) => {
  await ensureCompanyCanOrder(companyId);

  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;
  const status = parseOrderStatus(query.status);

  const { orders, total } = await findCompanyOrders({
    companyId: companyId!,
    status,
    skip,
    take: limit,
    sortBy: query.sortBy,
    order: query.order,
  });

  return {
    data: orders.map(formatOrder),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getCompanyOrderById = async (
  companyId: string | undefined,
  orderId: string,
) => {
  await ensureCompanyCanOrder(companyId);

  const order = await findCompanyOrderById(orderId, companyId!);

  if (!order) {
    throw new ApiError(404, "Order not found", {
      code: "ORDER_NOT_FOUND",
    });
  }

  return formatOrder(order);
};

export const acceptOrder = async (sellerId: string, orderId: string) => {
  const result = await updateOrderStatus({
    orderId,
    sellerId,
    currentStatuses: [OrderStatus.CREATED],
    nextStatus: OrderStatus.ACCEPTED,
    farmerAccepted: true,
  });

  if ("error" in result) {
    if (result.error === "ORDER_NOT_FOUND") {
      throw new ApiError(404, "Order not found", {
        code: "ORDER_NOT_FOUND",
      });
    }

    throw new ApiError(
      409,
      `Order cannot be accepted from status ${result.currentStatus}`,
      {
        code: "INVALID_STATUS_TRANSITION",
      },
    );
  }

  return {
    message: "Order accepted successfully",
    order: formatOrder(result.order),
    notificationPayload: {
      company: {
        id: result.order.company.companyId,
        name: result.order.company.companyName,
        email: result.order.company.email,
        hqLocation: result.order.company.hqLocation,
      },
      order: {
        id: result.order.orderId,
        status: result.order.orderStatus,
        paymentStatus: result.order.paymentStatus,
        productName: result.order.productName,
        productUnit: result.order.productUnit,
        quantity: result.order.quantity,
        totalAmount: result.order.finalPrice,
      },
    },
  };
};

export const rejectOrder = async (sellerId: string, orderId: string) => {
  const result = await updateOrderStatus({
    orderId,
    sellerId,
    currentStatuses: [OrderStatus.CREATED],
    nextStatus: OrderStatus.REJECTED,
    farmerAccepted: false,
    restoreQuantity: true,
  });

  if ("error" in result) {
    if (result.error === "ORDER_NOT_FOUND") {
      throw new ApiError(404, "Order not found", {
        code: "ORDER_NOT_FOUND",
      });
    }

    throw new ApiError(
      409,
      `Order cannot be rejected from status ${result.currentStatus}`,
      {
        code: "INVALID_STATUS_TRANSITION",
      },
    );
  }

  return {
    message: "Order rejected successfully",
    order: formatOrder(result.order),
    notificationPayload: {
      company: {
        id: result.order.company.companyId,
        name: result.order.company.companyName,
        email: result.order.company.email,
        hqLocation: result.order.company.hqLocation,
      },
      order: {
        id: result.order.orderId,
        status: result.order.orderStatus,
        paymentStatus: result.order.paymentStatus,
        productName: result.order.productName,
        productUnit: result.order.productUnit,
        quantity: result.order.quantity,
        totalAmount: result.order.finalPrice,
      },
      metadata: {
        reason: "Seller rejected the order",
      },
    },
  };
};

export const cancelOrder = async (
  companyId: string | undefined,
  orderId: string,
) => {
  await ensureCompanyCanOrder(companyId);

  const result = await updateOrderStatus({
    orderId,
    companyId: companyId!,
    currentStatuses: [OrderStatus.CREATED],
    nextStatus: OrderStatus.CANCELLED,
    restoreQuantity: true,
  });

  if ("error" in result) {
    if (result.error === "ORDER_NOT_FOUND") {
      throw new ApiError(404, "Order not found", {
        code: "ORDER_NOT_FOUND",
      });
    }

    throw new ApiError(
      409,
      `Order cannot be cancelled from status ${result.currentStatus}`,
      {
        code: "INVALID_STATUS_TRANSITION",
      },
    );
  }

  return {
    message: "Order cancelled successfully",
    order: formatOrder(result.order),
    notificationPayload: {
      company: {
        id: result.order.company.companyId,
        name: result.order.company.companyName,
        email: result.order.company.email,
        hqLocation: result.order.company.hqLocation,
      },
      order: {
        id: result.order.orderId,
        status: result.order.orderStatus,
        paymentStatus: result.order.paymentStatus,
        productName: result.order.productName,
        productUnit: result.order.productUnit,
        quantity: result.order.quantity,
        totalAmount: result.order.finalPrice,
      },
      metadata: {
        reason: "Company cancelled the order",
      },
    },
  };
};

export const getFarmerOrderForAuthorization = async (
  sellerId: string,
  orderId: string,
) => {
  const order = await findFarmerOrderById(orderId, sellerId);

  if (!order) {
    throw new ApiError(404, "Order not found", {
      code: "ORDER_NOT_FOUND",
    });
  }

  return formatOrder(order);
};

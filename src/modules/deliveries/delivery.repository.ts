/**
 * Module: Delivery.repository
 * Purpose: Implements the Delivery.repository module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import {
  AssignmentType,
  DeliveryStatus,
  Prisma,
  UserRole,
  VerificationStatus,
} from "@prisma/client";
import prisma from "../../config/prisma";
import { DELIVERY_ORDER_STATUS_MAP } from "./delivery.constants";

const terminalDeliveryStatuses = new Set<DeliveryStatus>([
  DeliveryStatus.DELIVERED,
  DeliveryStatus.FAILED,
  DeliveryStatus.CANCELLED,
]);

/**
 * Delivery Details Select.
 */
export const deliveryDetailsSelect = {
  deliveryId: true,
  orderId: true,
  assignedBy: true,
  partnerId: true,
  status: true,
  pickupTime: true,
  deliveryTime: true,
  createdAt: true,
  updatedAt: true,
  order: {
    select: {
      orderId: true,
      companyId: true,
      sellerId: true,
      quantity: true,
      finalPrice: true,
      productName: true,
      productCategory: true,
      productUnit: true,
      orderStatus: true,
      paymentStatus: true,
      createdAt: true,
      deliveryFee:true,
      company: {
        select: {
          companyId: true,
          companyName: true,
          email: true,
        },
      },
    },
  },
  partner: {
    select: {
      id: true,
      userId: true,
      vehicleType: true,
      licenseNumber: true,
      isAvailable: true,
      isActive: true,
      lastSeenAt: true,
      user: {
        select: {
          user_id: true,
          name: true,
          phone_no: true,
          email: true,
          role: true,
          isBlocked: true,
          verificationStatus: true,
        },
      },
    },
  },
} satisfies Prisma.DeliverySelect;

/**
 * Order For Delivery Assignment Select.
 */
export const orderForDeliveryAssignmentSelect = {
  orderId: true,
  companyId: true,
  sellerId: true,
  paymentStatus: true,
  orderStatus: true,
  delivery: {
    select: {
      deliveryId: true,
      partnerId: true,
      status: true,
    },
  },
} satisfies Prisma.OrderSelect;

/**
 * Delivery Partner Select.
 */
export const deliveryPartnerSelect = {
  id: true,
  userId: true,
  vehicleType: true,
  licenseNumber: true,
  isAvailable: true,
  isActive: true,
  currentLat: true,
  currentLng: true,
  lastSeenAt: true,
  user: {
    select: {
      user_id: true,
      name: true,
      email: true,
      phone_no: true,
      role: true,
      isBlocked: true,
      verificationStatus: true,
    },
  },
} satisfies Prisma.DeliveryPartnerSelect;

/**
 * Find Order For Delivery Assignment.
 */
export const findOrderForDeliveryAssignment = (
  orderId: string,
  companyId?: string,
) =>
  prisma.order.findFirst({
    where: {
      orderId,
      ...(companyId ? { companyId } : {}),
    },
    select: orderForDeliveryAssignmentSelect,
  });

/**
 * Find Delivery By Id.
 */
export const findDeliveryById = (deliveryId: string) =>
  prisma.delivery.findUnique({
    where: { deliveryId },
    select: deliveryDetailsSelect,
  });

/**
 * Find Delivery Partner By Id.
 */
export const findDeliveryPartnerById = (deliveryPartnerId: string) =>
  prisma.deliveryPartner.findUnique({
    where: { id: deliveryPartnerId },
    select: deliveryPartnerSelect,
  });

/**
 * Find Next Available Partner.
 */
export const findNextAvailablePartner = () =>
  prisma.deliveryPartner.findFirst({
    where: {
      isAvailable: true,
      isActive: true,
      user: {
        role: UserRole.DELIVERY_PARTNER,
        isBlocked: false,
        verificationStatus: VerificationStatus.VERIFIED,
      },
    },
    orderBy: [{ updatedAt: "asc" }, { createdAt: "asc" }],
    select: deliveryPartnerSelect,
  });

/**
 * Create Or Reassign Delivery.
 */
export const createOrReassignDelivery = async ({
  orderId,
  assignedBy,
  deliveryPartnerId,
}: {
  orderId: string;
  assignedBy: string;
  deliveryPartnerId: string;
}) =>
  prisma.$transaction(async (tx) => {
    const existingDelivery = await tx.delivery.findUnique({
      where: { orderId },
      select: {
        deliveryId: true,
        partnerId: true,
        status: true,
      },
    });

    if (!existingDelivery) {
      await tx.delivery.create({
        data: {
          orderId,
          assignedBy: AssignmentType.SYSTEM,
          partnerId: deliveryPartnerId,
          status: DeliveryStatus.ASSIGNED,
        },
      });
    } else {
      if (
        existingDelivery.partnerId &&
        existingDelivery.partnerId !== deliveryPartnerId
      ) {
        await tx.deliveryPartner.update({
          where: { id: existingDelivery.partnerId },
          data: {
            isAvailable: true,
            lastSeenAt: new Date(),
          },
        });
      }

      await tx.delivery.update({
        where: { orderId },
        data: {
          assignedBy: AssignmentType.SYSTEM,
          partnerId: deliveryPartnerId,
          status: DeliveryStatus.ASSIGNED,
          pickupTime: null,
          deliveryTime: null,
        },
      });
    }

    await tx.deliveryPartner.update({
      where: { id: deliveryPartnerId },
      data: {
        isAvailable: false,
        lastSeenAt: new Date(),
      },
    });

    await tx.order.update({
      where: { orderId },
      data: {
        orderStatus: DELIVERY_ORDER_STATUS_MAP[DeliveryStatus.ASSIGNED],
      },
    });

    return tx.delivery.findUniqueOrThrow({
      where: { orderId },
      select: deliveryDetailsSelect,
    });
  });

/**
 * Update Delivery Status Record.
 */
export const updateDeliveryStatusRecord = async ({
  deliveryId,
  status,
}: {
  deliveryId: string;
  status: DeliveryStatus;
}) =>
  prisma.$transaction(async (tx) => {
    const current = await tx.delivery.findUnique({
      where: { deliveryId },
      select: {
        partnerId: true,
      },
    });

    await tx.delivery.update({
      where: { deliveryId },
      data: {
        status,
        ...(status === DeliveryStatus.PICKED_UP
          ? { pickupTime: new Date() }
          : {}),
        ...(status === DeliveryStatus.DELIVERED
          ? { deliveryTime: new Date() }
          : {}),
      },
    });

    await tx.order.update({
      where: {
        orderId: (
          await tx.delivery.findUniqueOrThrow({
            where: { deliveryId },
            select: { orderId: true },
          })
        ).orderId,
      },
      data: {
        orderStatus: DELIVERY_ORDER_STATUS_MAP[status],
      },
    });

    if (current?.partnerId && terminalDeliveryStatuses.has(status)) {
      await tx.deliveryPartner.update({
        where: { id: current.partnerId },
        data: {
          isAvailable: true,
          lastSeenAt: new Date(),
        },
      });
    }

    return tx.delivery.findUniqueOrThrow({
      where: { deliveryId },
      select: deliveryDetailsSelect,
    });
  });

// 🔥 Get Available Jobs
export const findAvailableJobs = () =>
  prisma.delivery.findMany({
    where: {
      status: DeliveryStatus.PENDING_ASSIGNMENT,
      assignmentStatus: "OPEN",
      assignmentExpiresAt: {
        gt: new Date(),
      },
    },
    orderBy: [{ createdAt: "desc" }],
    select: deliveryDetailsSelect,
  });

// 🔥 Accept Job (ATOMIC)
export const acceptDeliveryJob = async (deliveryId: string, userId: string) => {
  return prisma.$transaction(async (tx) => {
    const partner = await tx.deliveryPartner.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!partner) {
      throw new Error("Delivery partner profile not found");
    }

    const updated = await tx.delivery.updateMany({
      where: {
        deliveryId,
        status: DeliveryStatus.PENDING_ASSIGNMENT,
        assignmentStatus: "OPEN",
        assignmentExpiresAt: {
          gt: new Date(),
        },
      },
      data: {
        partnerId: partner.id, // ✅ FIXED
        status: DeliveryStatus.ACCEPTED,
      },
    });

    if (updated.count === 0) {
      throw new Error("Job already taken or expired");
    }

    return tx.delivery.findUnique({
      where: { deliveryId },
      select: deliveryDetailsSelect,
    });
  });
};

// 🔥 Active Deliveries
export const findActiveDeliveries = (userId: string) =>
  prisma.delivery.findMany({
    where: {
      partner: {
        userId,
      },
      status: {
        in: [
          DeliveryStatus.ACCEPTED,
          DeliveryStatus.PICKED_UP,
          DeliveryStatus.IN_TRANSIT,
        ],
      },
    },
    orderBy: [{ updatedAt: "desc" }],
    select: deliveryDetailsSelect,
  });

// 🔥 Dashboard Counts
export const getDeliveryDashboardStats = async (userId: string) => {
  const [availableJobs, activeDeliveries] = await Promise.all([
    prisma.delivery.count({
      where: {
        status: DeliveryStatus.PENDING_ASSIGNMENT,
        assignmentStatus: "OPEN",
        assignmentExpiresAt: { gt: new Date() },
      },
    }),
    prisma.delivery.count({
      where: {
        partner: { userId },
        status: {
          in: [
            DeliveryStatus.ACCEPTED,
            DeliveryStatus.PICKED_UP,
            DeliveryStatus.IN_TRANSIT,
          ],
        },
      },
    }),
  ]);

  return {
    availableJobs,
    activeDeliveries,
  };
};

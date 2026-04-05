import { Prisma } from "@prisma/client";
import prisma from "../../config/prisma";
import { JOB_EXCLUDED_STATUSES } from "./deliveryPartner.constants";

export const deliveryPartnerProfileSelect = {
  id: true,
  userId: true,
  vehicleType: true,
  licenseNumber: true,
  isAvailable: true,
  isActive: true,
  currentLat: true,
  currentLng: true,
  lastSeenAt: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      user_id: true,
      name: true,
      phone_no: true,
      email: true,
      role: true,
    },
  },
} satisfies Prisma.DeliveryPartnerSelect;

export const deliveryPartnerJobSelect = {
  deliveryId: true,
  orderId: true,
  status: true,
  pickupTime: true,
  deliveryTime: true,
  createdAt: true,
  updatedAt: true,
  order: {
    select: {
      sellerId: true,
      company: {
        select: {
          companyId: true,
          companyName: true,
          hqLocation: true,
        },
      },
      listing: {
        select: {
          seller: {
            select: {
              user_id: true,
              name: true,
              address: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.DeliverySelect;

export const findDeliveryPartnerProfileByUserId = (userId: string) =>
  prisma.deliveryPartner.findUnique({
    where: { userId },
    select: deliveryPartnerProfileSelect,
  });

export const createDeliveryPartnerProfile = (data: {
  userId: string;
  vehicleType: string;
  licenseNumber: string;
}) =>
  prisma.deliveryPartner.create({
    data,
    select: deliveryPartnerProfileSelect,
  });

export const updateDeliveryPartnerAvailabilityByUserId = (
  userId: string,
  isAvailable: boolean,
) =>
  prisma.deliveryPartner.update({
    where: { userId },
    data: {
      isAvailable,
      lastSeenAt: new Date(),
    },
    select: deliveryPartnerProfileSelect,
  });

export const findDeliveryPartnerJobs = (deliveryPartnerId: string) =>
  prisma.delivery.findMany({
    where: {
      partnerId: deliveryPartnerId,
      status: {
        notIn: JOB_EXCLUDED_STATUSES,
      },
    },
    orderBy: [{ createdAt: "desc" }],
    select: deliveryPartnerJobSelect,
  });

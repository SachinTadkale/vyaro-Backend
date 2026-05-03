/**
 * Module: Delivery Partners.repository
 * Purpose: Implements the Delivery Partners.repository module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { Prisma, VehicleType } from "@prisma/client";
import prisma from "../../config/prisma";
import { JOB_EXCLUDED_STATUSES } from "./delivery-partners.constants";

/**
 * Delivery Partner Profile Select.
 */
export const deliveryPartnerProfileSelect = {
  id: true,
  userId: true,
  vehicleType: true,
  licenseNumber: true,
  vehicleNumber: true,
  isAvailable: true,
  isActive: true,
  capacity: true,
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

/**
 * Delivery Partner Job Select.
 */
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

/**
 * Find Delivery Partner Profile By User Id.
 */
export const findDeliveryPartnerProfileByUserId = (userId: string) =>
  prisma.deliveryPartner.findUnique({
    where: { userId },
    select: deliveryPartnerProfileSelect,
  });

/**
 * Create Delivery Partner Profile.
 */
export const createDeliveryPartnerProfile = (data: {
  userId: string;
  vehicleType: VehicleType;
  vehicleNumber: string;
  licenseNumber: string;
  capacity: number | null;
}) =>
  prisma.deliveryPartner.create({
    data: {
      ...data,
      capacity: data.capacity ?? null,
    },
    select: deliveryPartnerProfileSelect,
  });

/**
 * Update Delivery Partner Availability By User Id.
 */
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

/**
 * Find Delivery Partner Jobs.
 */
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

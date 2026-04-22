import { UserRole } from "@prisma/client";
import ApiError from "../../utils/apiError";
import {
  DELIVERY_PARTNER_ERROR_CODES,
  DELIVERY_PARTNER_ROLE,
} from "./delivery-partners.constants";
import {
  createDeliveryPartnerProfile,
  findDeliveryPartnerJobs,
  findDeliveryPartnerProfileByUserId,
  updateDeliveryPartnerAvailabilityByUserId,
} from "./delivery-partners.repository";
import {
  CreateDeliveryPartnerProfileInput,
  DeliveryPartnerActor,
  DeliveryPartnerJobRecord,
  DeliveryPartnerProfileRecord,
  UpdateDeliveryPartnerAvailabilityInput,
} from "./delivery-partners.types";
import prisma from "../../config/prisma";

const assertDeliveryPartnerRole = (actor: DeliveryPartnerActor) => {
  if (actor.role !== DELIVERY_PARTNER_ROLE) {
    throw new ApiError(403, "Only delivery partners can access this resource", {
      code: DELIVERY_PARTNER_ERROR_CODES.INVALID_ROLE,
    });
  }
};

const formatProfile = (profile: DeliveryPartnerProfileRecord) => ({
  id: profile.id,
  userId: profile.userId,
  vehicleType: profile.vehicleType,
  licenseNumber: profile.licenseNumber,
  isAvailable: profile.isAvailable,
  isActive: profile.isActive,
  currentLat: profile.currentLat,
  currentLng: profile.currentLng,
  lastSeenAt: profile.lastSeenAt,
  createdAt: profile.createdAt,
  updatedAt: profile.updatedAt,
  user: {
    id: profile.user.user_id,
    name: profile.user.name,
    phone: profile.user.phone_no,
    email: profile.user.email,
    role: profile.user.role,
  },
});

const formatJob = (job: DeliveryPartnerJobRecord) => ({
  deliveryId: job.deliveryId,
  orderId: job.orderId,
  status: job.status,
  pickupLocation: job.order.listing.seller.address,
  dropLocation: job.order.company.hqLocation,
  pickupTime: job.pickupTime,
  deliveryTime: job.deliveryTime,
  createdAt: job.createdAt,
  updatedAt: job.updatedAt,
});

const getRequiredProfile = async (userId: string) => {
  const profile = await findDeliveryPartnerProfileByUserId(userId);

  if (!profile) {
    throw new ApiError(404, "Delivery partner profile not found", {
      code: DELIVERY_PARTNER_ERROR_CODES.PROFILE_NOT_FOUND,
    });
  }

  return profile;
};

export const createProfile = async (
  actor: DeliveryPartnerActor,
  input: CreateDeliveryPartnerProfileInput,
) => {
  assertDeliveryPartnerRole(actor);

  const existingProfile = await findDeliveryPartnerProfileByUserId(
    actor.userId,
  );

  if (existingProfile) {
    throw new ApiError(409, "Delivery partner profile already exists", {
      code: DELIVERY_PARTNER_ERROR_CODES.PROFILE_ALREADY_EXISTS,
    });
  }

  const profile = await createDeliveryPartnerProfile({
    userId: actor.userId,
    vehicleType: input.vehicleType,
    licenseNumber: input.licenseNumber,
  });

  return formatProfile(profile);
};

export const getProfile = async (actor: DeliveryPartnerActor) => {
  assertDeliveryPartnerRole(actor);
  const profile = await getRequiredProfile(actor.userId);
  return formatProfile(profile);
};

export const updateAvailability = async (
  actor: DeliveryPartnerActor,
  input: UpdateDeliveryPartnerAvailabilityInput,
) => {
  assertDeliveryPartnerRole(actor);
  await getRequiredProfile(actor.userId);

  const profile = await updateDeliveryPartnerAvailabilityByUserId(
    actor.userId,
    input.isAvailable,
  );

  return formatProfile(profile);
};

export const getJobs = async (actor: DeliveryPartnerActor) => {
  assertDeliveryPartnerRole(actor);
  const profile = await getRequiredProfile(actor.userId);
  const jobs = await findDeliveryPartnerJobs(profile.id);

  return {
    partnerId: profile.id,
    jobs: jobs.map(formatJob),
  };
};

export const updateLocation = async (
  actor: DeliveryPartnerActor,
  input: { lat: number; lng: number },
) => {
  assertDeliveryPartnerRole(actor);
  await getRequiredProfile(actor.userId);

  return prisma.deliveryPartner.update({
    where: { userId: actor.userId },
    data: {
      currentLat: input.lat,
      currentLng: input.lng,
      lastSeenAt: new Date(),
    },
  });
};

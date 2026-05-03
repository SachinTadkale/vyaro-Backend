/**
 * Module: Delivery Partners.types
 * Purpose: Implements the Delivery Partners.types module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { Prisma, UserRole, VehicleType } from "@prisma/client";
import {
  deliveryPartnerJobSelect,
  deliveryPartnerProfileSelect,
} from "./delivery-partners.repository";

export type DeliveryPartnerActor = {
  userId: string;
  role?: UserRole;
  companyId?: string;
  actorType?: "FARMER" | "COMPANY" | "DELIVERY_PARTNER";
};

export type DeliveryPartnerProfileRecord = Prisma.DeliveryPartnerGetPayload<{
  select: typeof deliveryPartnerProfileSelect;
}>;

export type DeliveryPartnerJobRecord = Prisma.DeliveryGetPayload<{
  select: typeof deliveryPartnerJobSelect;
}>;

export type CreateDeliveryPartnerProfileInput = {
  vehicleType: VehicleType;
  vehicleNumber: string;
  licenseNumber: string;
  capacity: number;
};

export type UpdateDeliveryPartnerAvailabilityInput = {
  isAvailable: boolean;
};

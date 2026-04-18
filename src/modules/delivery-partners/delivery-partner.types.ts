import { Prisma, UserRole } from "@prisma/client";
import {
  deliveryPartnerJobSelect,
  deliveryPartnerProfileSelect,
} from "./delivery-partner.repository";

export type DeliveryPartnerActor = {
  userId: string;
  role?: UserRole;
  companyId?: string;
  actorType?: "USER" | "COMPANY";
};

export type DeliveryPartnerProfileRecord = Prisma.DeliveryPartnerGetPayload<{
  select: typeof deliveryPartnerProfileSelect;
}>;

export type DeliveryPartnerJobRecord = Prisma.DeliveryGetPayload<{
  select: typeof deliveryPartnerJobSelect;
}>;

export type CreateDeliveryPartnerProfileInput = {
  vehicleType: string;
  licenseNumber: string;
};

export type UpdateDeliveryPartnerAvailabilityInput = {
  isAvailable: boolean;
};

import { DeliveryStatus, Prisma, UserRole } from "@prisma/client";
import { deliveryDetailsSelect } from "./delivery.repository";

export type DeliveryAccessRole = "COMPANY" | "DELIVERY_PARTNER" | "ADMIN";

export type DeliveryActor = {
  userId: string;
  companyId?: string;
  role?: UserRole;
  actorType?: "USER" | "COMPANY";
};

export type DeliveryDetailsRecord = Prisma.DeliveryGetPayload<{
  select: typeof deliveryDetailsSelect;
}>;

export type DeliveryStatusUpdateResult = {
  delivery: DeliveryDetailsRecord;
  isNoop: boolean;
};

export type DeliveryStatusTransitionDecision =
  | { ok: true; isNoop: boolean }
  | { ok: false; code: "INVALID_STATUS_TRANSITION" };

export type AssignDeliveryInput = {
  orderId: string;
  deliveryPartnerId: string;
  idempotencyKey?: string;
};

export type UpdateDeliveryStatusInput = {
  status: DeliveryStatus;
};

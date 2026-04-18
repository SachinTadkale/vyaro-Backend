import { DisputeStatus, OrderStatus, PaymentStatus, UserRole } from "@prisma/client";

export const ACTIVE_DISPUTE_STATUSES = [
  DisputeStatus.OPEN,
  DisputeStatus.UNDER_REVIEW,
] as const;

export const DISPUTE_CREATION_PAYMENT_STATUSES = new Set<PaymentStatus>([
  PaymentStatus.ESCROWED,
  PaymentStatus.FROZEN,
  PaymentStatus.HELD,
]);

export const DISPUTE_BLOCKED_ORDER_STATUSES = new Set<OrderStatus>([
  OrderStatus.CANCELLED,
  OrderStatus.COMPLETED,
  OrderStatus.REJECTED,
]);

export const MAX_DISPUTES_PER_ORDER = 5;

export const DISPUTE_ALLOWED_ACTOR_TYPES = ["USER", "COMPANY"] as const;

export const DISPUTE_ADMIN_ROLE = UserRole.ADMIN;

export const DISPUTE_RESOLUTION_ACTIONS = [
  "RELEASE_PAYMENT",
  "REFUND",
] as const;

export type DisputeResolutionAction =
  (typeof DISPUTE_RESOLUTION_ACTIONS)[number];

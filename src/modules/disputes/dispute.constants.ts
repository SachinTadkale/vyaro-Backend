/**
 * Module: Dispute.constants
 * Purpose: Implements the Dispute.constants module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { DisputeStatus, OrderStatus, PaymentStatus, UserRole } from "@prisma/client";

/**
 * Active Dispute Statuses.
 */
export const ACTIVE_DISPUTE_STATUSES = [
  DisputeStatus.OPEN,
  DisputeStatus.UNDER_REVIEW,
] as const;

/**
 * Dispute Creation Payment Statuses.
 */
export const DISPUTE_CREATION_PAYMENT_STATUSES = new Set<PaymentStatus>([
  PaymentStatus.ESCROWED,
  PaymentStatus.FROZEN,
  PaymentStatus.HELD,
]);

/**
 * Dispute Blocked Order Statuses.
 */
export const DISPUTE_BLOCKED_ORDER_STATUSES = new Set<OrderStatus>([
  OrderStatus.CANCELLED,
  OrderStatus.COMPLETED,
  OrderStatus.REJECTED,
]);

/**
 * Max Disputes Per Order.
 */
export const MAX_DISPUTES_PER_ORDER = 5;

/**
 * Dispute Allowed Actor Types.
 */
export const DISPUTE_ALLOWED_ACTOR_TYPES = ["FARMER", "COMPANY"] as const;

/**
 * Dispute Admin Role.
 */
export const DISPUTE_ADMIN_ROLE = UserRole.ADMIN;

/**
 * Dispute Resolution Actions.
 */
export const DISPUTE_RESOLUTION_ACTIONS = [
  "RELEASE_PAYMENT",
  "REFUND",
] as const;

export type DisputeResolutionAction =
  (typeof DISPUTE_RESOLUTION_ACTIONS)[number];

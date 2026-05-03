/**
 * Module: Delivery.constants
 * Purpose: Implements the Delivery.constants module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { DeliveryStatus, OrderStatus, PaymentStatus } from "@prisma/client";

/**
 * Delivery Status Flow.
 */
export const DELIVERY_STATUS_FLOW: Record<
  DeliveryStatus,
  DeliveryStatus | null
> = {
  [DeliveryStatus.PENDING_ASSIGNMENT]: DeliveryStatus.ACCEPTED,
  [DeliveryStatus.ACCEPTED]: DeliveryStatus.PICKED_UP,
  [DeliveryStatus.ASSIGNED]: DeliveryStatus.PICKED_UP, // keep for backward compatibility (optional)

  [DeliveryStatus.PICKED_UP]: DeliveryStatus.IN_TRANSIT,
  [DeliveryStatus.IN_TRANSIT]: DeliveryStatus.DELIVERED,

  [DeliveryStatus.DELIVERED]: null,
  [DeliveryStatus.FAILED]: null,
  [DeliveryStatus.CANCELLED]: null,
};

/**
 * Delivery Terminal Statuses.
 */
export const DELIVERY_TERMINAL_STATUSES = new Set<DeliveryStatus>([
  DeliveryStatus.DELIVERED,
  DeliveryStatus.FAILED,
  DeliveryStatus.CANCELLED,
]);

/**
 * Delivery Failure Statuses.
 */
export const DELIVERY_FAILURE_STATUSES = new Set<DeliveryStatus>([
  DeliveryStatus.FAILED,
  DeliveryStatus.CANCELLED,
]);

/**
 * Override Allowed Statuses.
 */
export const OVERRIDE_ALLOWED_STATUSES = new Set<DeliveryStatus>([
  DeliveryStatus.FAILED,
  DeliveryStatus.CANCELLED,
]);

/**
 * Completed Payment Statuses.
 */
export const COMPLETED_PAYMENT_STATUSES = new Set<PaymentStatus>([
  PaymentStatus.HELD,
  PaymentStatus.ESCROWED,
  PaymentStatus.RELEASED,
  PaymentStatus.PAID,
  PaymentStatus.SUCCESS,
]);

/**
 * Delivery Order Status Map.
 */
export const DELIVERY_ORDER_STATUS_MAP: Record<DeliveryStatus, OrderStatus> = {
  [DeliveryStatus.PENDING_ASSIGNMENT]: OrderStatus.PROCESSING,
  [DeliveryStatus.ACCEPTED]: OrderStatus.PROCESSING,
  [DeliveryStatus.ASSIGNED]: OrderStatus.PROCESSING,

  [DeliveryStatus.PICKED_UP]: OrderStatus.DISPATCHED,
  [DeliveryStatus.IN_TRANSIT]: OrderStatus.IN_TRANSIT,

  [DeliveryStatus.DELIVERED]: OrderStatus.DELIVERED,
  [DeliveryStatus.FAILED]: OrderStatus.CONFIRMED,
  [DeliveryStatus.CANCELLED]: OrderStatus.CANCELLED,
};

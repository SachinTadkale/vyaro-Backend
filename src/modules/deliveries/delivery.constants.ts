import { DeliveryStatus, OrderStatus, PaymentStatus } from "@prisma/client";

export const DELIVERY_STATUS_FLOW: Record<
  DeliveryStatus,
  DeliveryStatus | null
> = {
  [DeliveryStatus.ASSIGNED]: DeliveryStatus.PICKED_UP,
  [DeliveryStatus.PICKED_UP]: DeliveryStatus.IN_TRANSIT,
  [DeliveryStatus.IN_TRANSIT]: DeliveryStatus.DELIVERED,
  [DeliveryStatus.DELIVERED]: null,
  [DeliveryStatus.FAILED]: null,
  [DeliveryStatus.CANCELLED]: null,
};

export const DELIVERY_TERMINAL_STATUSES = new Set<DeliveryStatus>([
  DeliveryStatus.DELIVERED,
  DeliveryStatus.FAILED,
  DeliveryStatus.CANCELLED,
]);

export const DELIVERY_FAILURE_STATUSES = new Set<DeliveryStatus>([
  DeliveryStatus.FAILED,
  DeliveryStatus.CANCELLED,
]);

export const OVERRIDE_ALLOWED_STATUSES = new Set<DeliveryStatus>([
  DeliveryStatus.FAILED,
  DeliveryStatus.CANCELLED,
]);

export const COMPLETED_PAYMENT_STATUSES = new Set<PaymentStatus>([
  PaymentStatus.HELD,
  PaymentStatus.ESCROWED,
  PaymentStatus.RELEASED,
  PaymentStatus.PAID,
  PaymentStatus.SUCCESS,
]);

export const DELIVERY_ORDER_STATUS_MAP: Record<DeliveryStatus, OrderStatus> = {
  [DeliveryStatus.ASSIGNED]: OrderStatus.PROCESSING,
  [DeliveryStatus.PICKED_UP]: OrderStatus.DISPATCHED,
  [DeliveryStatus.IN_TRANSIT]: OrderStatus.IN_TRANSIT,
  [DeliveryStatus.DELIVERED]: OrderStatus.DELIVERED,
  [DeliveryStatus.FAILED]: OrderStatus.CONFIRMED,
  [DeliveryStatus.CANCELLED]: OrderStatus.CANCELLED,
};

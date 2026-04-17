export enum NotificationEventType {
  USER_REGISTERED = "USER_REGISTERED",
  USER_APPROVED = "USER_APPROVED",
  USER_REJECTED = "USER_REJECTED",
  OTP_REQUESTED = "OTP_REQUESTED",
  PASSWORD_RESET = "PASSWORD_RESET",
  LISTING_CREATED = "LISTING_CREATED",
  REQUIREMENT_POSTED = "REQUIREMENT_POSTED",
  ORDER_PLACED = "ORDER_PLACED",
  ORDER_CONFIRMED = "ORDER_CONFIRMED",
  ORDER_CANCELLED = "ORDER_CANCELLED",
  PAYMENT_SUCCESS = "PAYMENT_SUCCESS",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  DELIVERY_ASSIGNED = "DELIVERY_ASSIGNED",
  DELIVERY_COMPLETED = "DELIVERY_COMPLETED",
  DISPUTE_CREATED = "DISPUTE_CREATED",
  DISPUTE_RESOLVED = "DISPUTE_RESOLVED",
  BROADCAST_ALERT = "BROADCAST_ALERT",
}

export type NotificationAudience = "USER" | "COMPANY" | "DELIVERY_PARTNER" | "ADMIN";
export type NotificationTone = "brand" | "success" | "warning" | "neutral";

export type NotificationUser = {
  id: string;
  name: string;
  email?: string | null;
};

export type NotificationCompany = {
  id: string;
  name: string;
  email?: string | null;
  hqLocation?: string | null;
};

export type NotificationOrder = {
  id: string;
  status?: string;
  paymentStatus?: string;
  productName: string;
  productUnit?: string | null;
  quantity: number | string;
  totalAmount: number | string;
};

export type NotificationListing = {
  id: string;
  productName: string;
  category?: string | null;
  unit?: string | null;
  price?: number | string | null;
  quantity?: number | string | null;
  status?: string | null;
};

export type NotificationPayment = {
  id?: string;
  orderId: string;
  amount: number | string;
  currency?: string | null;
  status?: string | null;
  failureReason?: string | null;
  releaseReference?: string | null;
};

export type NotificationDelivery = {
  id: string;
  orderId: string;
  status: string;
  partnerName?: string | null;
  partnerEmail?: string | null;
};

export type NotificationMetadata = Record<string, unknown> & {
  otp?: string;
  reason?: string;
  actionLabel?: string;
  actionHref?: string;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  requirementId?: string;
  requirementTitle?: string;
  requirementBudget?: string | number;
  requirementQuantity?: string | number;
  deliveryLocation?: string;
  closingDate?: string;
  disputeId?: string;
  broadcastType?: string;
};

export type NotificationPayload = {
  user?: NotificationUser;
  company?: NotificationCompany;
  order?: NotificationOrder;
  listing?: NotificationListing;
  payment?: NotificationPayment;
  delivery?: NotificationDelivery;
  metadata?: NotificationMetadata;
};

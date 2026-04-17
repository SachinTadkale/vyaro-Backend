import {
  sendApprovalEmail,
  sendEventNotificationEmail,
  sendOtpEmail,
  sendPasswordResetOtp,
  sendRejectionEmail,
} from "../../lib/email";
import {
  NotificationEventType,
  NotificationPayload,
} from "./notification.types";

const formatCurrency = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const numericValue =
    typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));

  if (Number.isFinite(numericValue)) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(numericValue);
  }

  return String(value);
};

const formatQuantity = (
  value: number | string | null | undefined,
  unit?: string | null
) => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  return unit ? `${value} ${unit}` : String(value);
};

const requireEmail = (email?: string | null) => {
  if (!email) {
    throw new Error("Notification recipient email is missing");
  }

  return email;
};

const buildActions = (payload: NotificationPayload) => {
  const primary =
    payload.metadata?.actionHref && payload.metadata?.actionLabel
      ? [
          {
            label: String(payload.metadata.actionLabel),
            href: String(payload.metadata.actionHref),
            variant: "primary" as const,
          },
        ]
      : [];

  const secondary =
    payload.metadata?.secondaryActionHref && payload.metadata?.secondaryActionLabel
      ? [
          {
            label: String(payload.metadata.secondaryActionLabel),
            href: String(payload.metadata.secondaryActionHref),
            variant: "secondary" as const,
          },
        ]
      : [];

  return [...primary, ...secondary];
};

export const dispatchNotificationEmail = async (
  eventType: NotificationEventType,
  payload: NotificationPayload
) => {
  switch (eventType) {
    case NotificationEventType.OTP_REQUESTED:
      await sendOtpEmail(
        requireEmail(payload.user?.email),
        payload.user?.name ?? "there",
        String(payload.metadata?.otp ?? "")
      );
      return;

    case NotificationEventType.PASSWORD_RESET:
      await sendPasswordResetOtp(
        requireEmail(payload.user?.email),
        payload.user?.name ?? "there",
        String(payload.metadata?.otp ?? "")
      );
      return;

    case NotificationEventType.USER_APPROVED:
      await sendApprovalEmail(
        requireEmail(payload.user?.email),
        payload.user?.name ?? "there"
      );
      return;

    case NotificationEventType.USER_REJECTED:
      await sendRejectionEmail(
        requireEmail(payload.user?.email),
        payload.user?.name ?? "there",
        typeof payload.metadata?.reason === "string"
          ? payload.metadata.reason
          : undefined
      );
      return;

    case NotificationEventType.USER_REGISTERED:
      await sendEventNotificationEmail({
        to: requireEmail(payload.user?.email),
        subject: "Welcome to Farmzy",
        audience: "USER",
        eventLabel: "Registration complete",
        title: "Your Farmzy account is ready",
        summary:
          "Your account has been created successfully and is now in the onboarding flow.",
        introLines: [
          "Complete your profile and verification details to unlock marketplace access."
        ],
        details: [
          { label: "Account name", value: payload.user?.name },
          { label: "Email", value: payload.user?.email },
        ],
        actions: buildActions(payload),
        tone: "success",
      });
      return;

    case NotificationEventType.LISTING_CREATED:
      await sendEventNotificationEmail({
        to: requireEmail(payload.user?.email),
        subject: "Listing created successfully",
        audience: "USER",
        eventLabel: "Listing created",
        title: "Your listing is now live",
        summary: "Your marketplace listing is active and visible to buyers.",
        details: [
          { label: "Listing ID", value: payload.listing?.id },
          { label: "Commodity", value: payload.listing?.productName },
          {
            label: "Quantity",
            value: formatQuantity(payload.listing?.quantity, payload.listing?.unit),
          },
          { label: "Price", value: formatCurrency(payload.listing?.price) },
          { label: "Status", value: payload.listing?.status },
        ],
        actions: buildActions(payload),
        tone: "success",
      });
      return;

    case NotificationEventType.REQUIREMENT_POSTED:
      await sendEventNotificationEmail({
        to: requireEmail(payload.company?.email),
        subject: "Requirement posted successfully",
        audience: "COMPANY",
        eventLabel: "Requirement posted",
        title: "Your procurement requirement is now live",
        summary:
          "Your team has successfully published a new requirement in the Farmzy workspace.",
        details: [
          { label: "Requirement ID", value: payload.metadata?.requirementId },
          { label: "Title", value: payload.metadata?.requirementTitle },
          { label: "Quantity", value: payload.metadata?.requirementQuantity },
          {
            label: "Budget",
            value: formatCurrency(payload.metadata?.requirementBudget as number | string),
          },
          { label: "Delivery", value: payload.metadata?.deliveryLocation },
          { label: "Closing Date", value: payload.metadata?.closingDate },
        ],
        actions: buildActions(payload),
        tone: "success",
      });
      return;

    case NotificationEventType.ORDER_PLACED:
      await sendEventNotificationEmail({
        to: requireEmail(payload.company?.email),
        subject: "Order placed successfully",
        audience: "COMPANY",
        eventLabel: "Order placed",
        title: "Your order has been created",
        summary: "Your order was placed successfully and is awaiting seller action.",
        details: [
          { label: "Order ID", value: payload.order?.id },
          { label: "Commodity", value: payload.order?.productName },
          {
            label: "Quantity",
            value: formatQuantity(payload.order?.quantity, payload.order?.productUnit),
          },
          { label: "Total Amount", value: formatCurrency(payload.order?.totalAmount) },
          { label: "Order Status", value: payload.order?.status },
        ],
        actions: buildActions(payload),
        tone: "success",
      });
      return;

    case NotificationEventType.ORDER_CONFIRMED:
      await sendEventNotificationEmail({
        to: requireEmail(payload.company?.email),
        subject: "Order confirmed",
        audience: "COMPANY",
        eventLabel: "Order confirmed",
        title: "Your order has been accepted",
        summary:
          "The seller has confirmed your order and the transaction can proceed to payment.",
        details: [
          { label: "Order ID", value: payload.order?.id },
          { label: "Commodity", value: payload.order?.productName },
          {
            label: "Quantity",
            value: formatQuantity(payload.order?.quantity, payload.order?.productUnit),
          },
          { label: "Total Amount", value: formatCurrency(payload.order?.totalAmount) },
        ],
        actions: buildActions(payload),
        tone: "success",
      });
      return;

    case NotificationEventType.ORDER_CANCELLED:
      await sendEventNotificationEmail({
        to: requireEmail(payload.company?.email),
        subject: "Order cancelled",
        audience: "COMPANY",
        eventLabel: "Order cancelled",
        title: "Your order has been cancelled",
        summary: "This order is no longer active on the Farmzy platform.",
        details: [
          { label: "Order ID", value: payload.order?.id },
          { label: "Commodity", value: payload.order?.productName },
          { label: "Status", value: payload.order?.status },
          { label: "Reason", value: payload.metadata?.reason },
        ],
        actions: buildActions(payload),
        tone: "warning",
      });
      return;

    case NotificationEventType.PAYMENT_SUCCESS:
      await sendEventNotificationEmail({
        to: requireEmail(payload.company?.email),
        subject: "Payment received successfully",
        audience: "COMPANY",
        eventLabel: "Payment successful",
        title: "Your payment is secured",
        summary:
          "Payment has been verified successfully and the order amount is now secured in escrow.",
        details: [
          { label: "Order ID", value: payload.payment?.orderId },
          { label: "Payment ID", value: payload.payment?.id },
          { label: "Amount", value: formatCurrency(payload.payment?.amount) },
          { label: "Payment Status", value: payload.payment?.status },
        ],
        actions: buildActions(payload),
        tone: "success",
      });
      return;

    case NotificationEventType.PAYMENT_FAILED:
      await sendEventNotificationEmail({
        to: requireEmail(payload.company?.email),
        subject: "Payment failed",
        audience: "COMPANY",
        eventLabel: "Payment failed",
        title: "Your payment could not be completed",
        summary:
          "The payment attempt for this order did not complete successfully.",
        details: [
          { label: "Order ID", value: payload.payment?.orderId },
          { label: "Amount", value: formatCurrency(payload.payment?.amount) },
          { label: "Reason", value: payload.payment?.failureReason },
        ],
        actions: buildActions(payload),
        tone: "warning",
      });
      return;

    case NotificationEventType.DELIVERY_ASSIGNED:
      await sendEventNotificationEmail({
        to: requireEmail(payload.delivery?.partnerEmail),
        subject: "New delivery assigned",
        audience: "DELIVERY_PARTNER",
        eventLabel: "Delivery assigned",
        title: "A new delivery job has been assigned",
        summary:
          "A new delivery has been assigned to your account and is ready for action.",
        details: [
          { label: "Delivery ID", value: payload.delivery?.id },
          { label: "Order ID", value: payload.delivery?.orderId },
          { label: "Status", value: payload.delivery?.status },
        ],
        actions: buildActions(payload),
        tone: "brand",
      });
      return;

    case NotificationEventType.DELIVERY_COMPLETED:
      await sendEventNotificationEmail({
        to: requireEmail(payload.company?.email),
        subject: "Delivery completed",
        audience: "COMPANY",
        eventLabel: "Delivery completed",
        title: "Your order has been delivered",
        summary: "The delivery for this order has been completed successfully.",
        details: [
          { label: "Delivery ID", value: payload.delivery?.id },
          { label: "Order ID", value: payload.delivery?.orderId },
          { label: "Status", value: payload.delivery?.status },
        ],
        actions: buildActions(payload),
        tone: "success",
      });
      return;

    case NotificationEventType.DISPUTE_CREATED:
      await sendEventNotificationEmail({
        to: requireEmail(payload.company?.email ?? payload.user?.email),
        subject: "Dispute created",
        audience: payload.company?.email ? "COMPANY" : "USER",
        eventLabel: "Dispute opened",
        title: "A dispute has been created for this transaction",
        summary:
          "A dispute has been opened and is now under review on the Farmzy platform.",
        details: [
          { label: "Dispute ID", value: payload.metadata?.disputeId },
          { label: "Order ID", value: payload.order?.id ?? payload.payment?.orderId },
          { label: "Status", value: "Open" },
        ],
        actions: buildActions(payload),
        tone: "warning",
      });
      return;

    case NotificationEventType.DISPUTE_RESOLVED:
      await sendEventNotificationEmail({
        to: requireEmail(payload.company?.email ?? payload.user?.email),
        audience: payload.company?.email ? "COMPANY" : "USER",
        subject: "Dispute resolved",
        eventLabel: "Dispute resolved",
        title: "Your dispute has been resolved",
        summary: "The dispute review has been completed and the case is now closed.",
        details: [
          { label: "Dispute ID", value: payload.metadata?.disputeId },
          { label: "Order ID", value: payload.order?.id ?? payload.payment?.orderId },
          { label: "Resolution", value: payload.metadata?.reason },
        ],
        actions: buildActions(payload),
        tone: "success",
      });
      return;

    case NotificationEventType.BROADCAST_ALERT:
      await sendEventNotificationEmail({
        to: requireEmail(payload.company?.email ?? payload.user?.email),
        audience: payload.company?.email
          ? "COMPANY"
          : payload.metadata?.broadcastType === "DELIVERY_PARTNER"
            ? "DELIVERY_PARTNER"
            : "USER",
        subject: String(payload.metadata?.subject ?? "Farmzy platform alert"),
        eventLabel: "Platform alert",
        title: String(payload.metadata?.title ?? "Important platform communication"),
        summary: String(
          payload.metadata?.summary ??
            "Farmzy has shared an important platform-wide alert that requires attention."
        ),
        introLines: payload.metadata?.reason
          ? [String(payload.metadata.reason)]
          : [],
        details: [
          { label: "Audience", value: payload.metadata?.broadcastType },
          { label: "Priority", value: "High" },
        ],
        actions: buildActions(payload),
        tone: "warning",
      });
      return;

    default:
      return;
  }
};

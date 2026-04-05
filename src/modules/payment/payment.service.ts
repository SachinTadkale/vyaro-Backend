import axios from "axios";
import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import ApiError from "../../utils/apiError";
import {
  createOrReuseInitiatedPayment,
  findOrderForPaymentByCompany,
  findPaymentByOrderId,
  findPaymentByOrderIdForCompany,
  findPaymentByRazorpayOrderId,
  findPaymentByRazorpayPaymentId,
  markPaymentFailed,
  markPaymentVerifiedAndHeld,
  releasePaymentToFarmer,
  storeWebhookEventIfNew,
} from "./payment.repository";
import {
  DEFAULT_CURRENCY,
  buildBasicAuthHeader,
  buildReceipt,
  parseWebhookPayload,
  toPaise,
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from "./payment.utils";
import {
  CreatePaymentOrderResult,
  PaymentDetailsRecord,
  ReleasePaymentResult,
  RazorpayOrderResponse,
  RazorpayWebhookEnvelope,
  VerifyPaymentResult,
} from "./payment.types";
import {
  CreatePaymentOrderInput,
  ReleasePaymentInput,
  VerifyPaymentInput,
} from "./payment.validation";

const getPaymentConfig = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const apiBaseUrl =
    process.env.RAZORPAY_API_BASE_URL ?? "https://api.razorpay.com";
  const releaseMode = process.env.RAZORPAY_RELEASE_MODE ?? "MANUAL";

  if (!keyId || !keySecret || !webhookSecret) {
    throw new ApiError(500, "Payment gateway is not configured", {
      code: "PAYMENT_CONFIG_MISSING",
    });
  }

  return {
    keyId,
    keySecret,
    webhookSecret,
    apiBaseUrl,
    releaseMode,
  };
};

const razorpayClient = () => {
  const config = getPaymentConfig();

  return axios.create({
    baseURL: config.apiBaseUrl,
    headers: {
      Authorization: buildBasicAuthHeader(config.keyId, config.keySecret),
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
};

const formatPaymentDetails = (payment: PaymentDetailsRecord) => ({
  paymentId: payment.paymentId,
  orderId: payment.orderId,
  companyId: payment.companyId,
  farmerId: payment.userId,
  amount: payment.amount,
  amountInPaise: payment.amountInPaise,
  currency: payment.currency,
  status: payment.status,
  method: payment.method,
  receipt: payment.receipt,
  idempotencyKey: payment.idempotencyKey,
  failureReason: payment.failureReason,
  releaseMode: payment.releaseMode,
  releaseReference: payment.releaseReference,
  razorpayOrderId: payment.razorpayOrderId,
  razorpayPaymentId: payment.razorpayPaymentId,
  initiatedAt: payment.initiatedAt,
  paidAt: payment.paidAt,
  heldAt: payment.heldAt,
  releasedAt: payment.releasedAt,
  failedAt: payment.failedAt,
  createdAt: payment.createdAt,
  updatedAt: payment.updatedAt,
  order: {
    id: payment.order.orderId,
    status: payment.order.orderStatus,
    paymentStatus: payment.order.paymentStatus,
    quantity: payment.order.quantity,
    unitPrice: payment.order.unitPrice,
    finalPrice: payment.order.finalPrice,
    product: {
      name: payment.order.productName,
      category: payment.order.productCategory,
      unit: payment.order.productUnit,
    },
    company: payment.order.company,
  },
  farmer: {
    id: payment.user.user_id,
    name: payment.user.name,
    phone: payment.user.phone_no,
    email: payment.user.email,
    bankDetails: payment.user.bankDetails
      ? {
          id: payment.user.bankDetails.id,
          accountHolder: payment.user.bankDetails.accountHolder,
          bankName: payment.user.bankDetails.bankName,
          accountNumberLast4: payment.user.bankDetails.accountNumberLast4,
          ifscLast4: payment.user.bankDetails.ifscLast4,
        }
      : null,
  },
  releaseTransactions: payment.transactions,
});

const assertOrderPayable = (
  orderStatus: OrderStatus,
  paymentStatus: PaymentStatus,
) => {
  const blockedOrderStatuses: OrderStatus[] = [
    OrderStatus.CANCELLED,
    OrderStatus.REJECTED,
    OrderStatus.COMPLETED,
  ];
  const settledPaymentStatuses: PaymentStatus[] = [
    PaymentStatus.HELD,
    PaymentStatus.RELEASED,
  ];

  if (
    blockedOrderStatuses.includes(orderStatus)
  ) {
    throw new ApiError(409, "This order is no longer payable", {
      code: "ORDER_NOT_PAYABLE",
    });
  }

  if (settledPaymentStatuses.includes(paymentStatus)) {
    throw new ApiError(409, "Order payment has already been completed", {
      code: "PAYMENT_ALREADY_COMPLETED",
    });
  }
};

export const createPaymentOrder = async (
  companyId: string | undefined,
  input: CreatePaymentOrderInput,
): Promise<CreatePaymentOrderResult> => {
  if (!companyId) {
    throw new ApiError(401, "Unauthorized", { code: "UNAUTHORIZED" });
  }

  const order = await findOrderForPaymentByCompany(input.orderId, companyId);

  if (!order) {
    throw new ApiError(404, "Order not found", {
      code: "ORDER_NOT_FOUND",
    });
  }

  assertOrderPayable(order.orderStatus, order.paymentStatus);

  if (
    order.payment?.status === PaymentStatus.INITIATED &&
    order.payment.razorpayOrderId
  ) {
    return {
      paymentId: order.payment.paymentId,
      orderId: order.orderId,
      razorpayOrderId: order.payment.razorpayOrderId,
      amount: order.payment.amount,
      amountInPaise: order.payment.amountInPaise,
      currency: order.payment.currency,
      keyId: getPaymentConfig().keyId,
      status: order.payment.status,
      receipt: order.payment.receipt,
      isExistingOrder: true,
    };
  }

  const amount = order.finalPrice;
  const amountInPaise = toPaise(amount);
  const receipt = buildReceipt(order.orderId);
  const client = razorpayClient();
  const { keyId } = getPaymentConfig();

  let razorpayOrder: RazorpayOrderResponse;
  try {
    const response = await client.post<RazorpayOrderResponse>("/v1/orders", {
      amount: amountInPaise,
      currency: DEFAULT_CURRENCY,
      receipt,
      notes: {
        orderId: order.orderId,
        companyId: order.companyId,
        sellerId: order.sellerId,
      },
    });

    razorpayOrder = response.data;
  } catch (error) {
    throw new ApiError(502, "Unable to initialize payment order", {
      code: "RAZORPAY_ORDER_CREATE_FAILED",
      details: axios.isAxiosError(error) ? error.response?.data : undefined,
    });
  }

  const payment = await createOrReuseInitiatedPayment({
    order,
    amount,
    amountInPaise,
    currency: DEFAULT_CURRENCY,
    receipt,
    idempotencyKey: input.idempotencyKey,
    razorpayOrderId: razorpayOrder.id,
  });

  return {
    paymentId: payment.paymentId,
    orderId: payment.orderId,
    razorpayOrderId: payment.razorpayOrderId!,
    amount: payment.amount,
    amountInPaise: payment.amountInPaise,
    currency: payment.currency,
    keyId,
    status: payment.status,
    receipt: payment.receipt,
    isExistingOrder: false,
  };
};

export const verifyPayment = async (
  companyId: string | undefined,
  input: VerifyPaymentInput,
): Promise<VerifyPaymentResult> => {
  if (!companyId) {
    throw new ApiError(401, "Unauthorized", { code: "UNAUTHORIZED" });
  }

  const payment = await findPaymentByOrderIdForCompany(input.orderId, companyId);

  if (!payment) {
    throw new ApiError(404, "Payment not found for order", {
      code: "PAYMENT_NOT_FOUND",
    });
  }

  if (
    payment.status === PaymentStatus.HELD ||
    payment.status === PaymentStatus.RELEASED
  ) {
    return {
      paymentId: payment.paymentId,
      orderId: payment.orderId,
      orderStatus: payment.order.orderStatus,
      paymentStatus: payment.status,
      razorpayPaymentId: payment.razorpayPaymentId,
      heldAt: payment.heldAt,
    };
  }

  const config = getPaymentConfig();
  const isValidSignature = verifyCheckoutSignature({
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId,
    razorpaySignature: input.razorpaySignature,
    keySecret: config.keySecret,
  });

  if (!isValidSignature) {
    await markPaymentFailed({
      orderId: input.orderId,
      failureReason: "Signature verification failed",
    });

    throw new ApiError(400, "Invalid payment signature", {
      code: "INVALID_PAYMENT_SIGNATURE",
    });
  }

  const duplicatePayment = await findPaymentByRazorpayPaymentId(
    input.razorpayPaymentId,
  );
  if (duplicatePayment && duplicatePayment.orderId !== input.orderId) {
    throw new ApiError(409, "Payment already linked with another order", {
      code: "PAYMENT_ID_ALREADY_USED",
    });
  }

  const heldPayment = await markPaymentVerifiedAndHeld({
    orderId: input.orderId,
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId,
    razorpaySignature: input.razorpaySignature,
    method: input.method,
  });

  if (!heldPayment) {
    throw new ApiError(404, "Payment not found for order", {
      code: "PAYMENT_NOT_FOUND",
    });
  }

  return {
    paymentId: heldPayment.paymentId,
    orderId: heldPayment.orderId,
    orderStatus: heldPayment.order.orderStatus,
    paymentStatus: heldPayment.status,
    razorpayPaymentId: heldPayment.razorpayPaymentId,
    heldAt: heldPayment.heldAt,
  };
};

export const getPaymentDetails = async (
  orderId: string,
  actor: {
    companyId?: string;
    userId: string;
    role?: string;
    actorType?: "USER" | "COMPANY";
  },
) => {
  const payment = await findPaymentByOrderId(orderId);

  if (!payment) {
    throw new ApiError(404, "Payment not found", {
      code: "PAYMENT_NOT_FOUND",
    });
  }

  const isCompanyOwner =
    actor.actorType === "COMPANY" && actor.companyId === payment.companyId;
  const isFarmerOwner =
    actor.actorType === "USER" && actor.userId === payment.userId;
  const isAdmin = actor.role === "ADMIN";

  if (!isCompanyOwner && !isFarmerOwner && !isAdmin) {
    throw new ApiError(403, "Forbidden", {
      code: "FORBIDDEN",
    });
  }

  return formatPaymentDetails(payment);
};

export const releasePayment = async (
  orderId: string,
  input: ReleasePaymentInput,
): Promise<ReleasePaymentResult> => {
  const payment = await findPaymentByOrderId(orderId);

  if (!payment) {
    throw new ApiError(404, "Payment not found", {
      code: "PAYMENT_NOT_FOUND",
    });
  }

  if (
    payment.status !== PaymentStatus.HELD &&
    payment.status !== PaymentStatus.RELEASED
  ) {
    throw new ApiError(409, "Payment must be held before release", {
      code: "PAYMENT_NOT_HELD",
    });
  }

  if (
    !([OrderStatus.DELIVERED, OrderStatus.COMPLETED] as OrderStatus[]).includes(
      payment.order.orderStatus,
    )
  ) {
    throw new ApiError(409, "Payment can be released only after delivery succeeds", {
      code: "ORDER_NOT_DELIVERED",
    });
  }

  const config = getPaymentConfig();
  let releaseReference = input.releaseReference ?? `manual_${Date.now()}`;

  if (config.releaseMode === "ROUTE") {
    throw new ApiError(501, "ROUTE release mode is not configured in this schema yet", {
      code: "ROUTE_RELEASE_NOT_SUPPORTED",
    });
  }

  const releasedPayment = await releasePaymentToFarmer({
    orderId,
    releaseMode: config.releaseMode,
    releaseReference,
  });

  if (!releasedPayment) {
    throw new ApiError(404, "Payment not found", {
      code: "PAYMENT_NOT_FOUND",
    });
  }

  if ("error" in releasedPayment) {
    throw new ApiError(409, "Farmer bank details are required before release", {
      code: "BANK_DETAILS_NOT_FOUND",
    });
  }

  return {
    paymentId: releasedPayment.paymentId,
    orderId: releasedPayment.orderId,
    orderStatus: releasedPayment.order.orderStatus,
    paymentStatus: releasedPayment.status,
    releaseMode: releasedPayment.releaseMode,
    releaseReference: releasedPayment.releaseReference,
    releasedAt: releasedPayment.releasedAt,
  };
};

export const handleWebhook = async (
  rawPayload: Buffer,
  signature?: string,
  eventId?: string,
) => {
  if (!signature || !eventId) {
    throw new ApiError(400, "Missing Razorpay webhook headers", {
      code: "INVALID_WEBHOOK_HEADERS",
    });
  }

  const config = getPaymentConfig();
  const isValid = verifyWebhookSignature({
    payload: rawPayload,
    signature,
    webhookSecret: config.webhookSecret,
  });

  if (!isValid) {
    throw new ApiError(400, "Invalid webhook signature", {
      code: "INVALID_WEBHOOK_SIGNATURE",
    });
  }

  const payload = parseWebhookPayload<RazorpayWebhookEnvelope>(rawPayload);
  const razorpayOrderId =
    payload.payload?.payment?.entity?.order_id ??
    payload.payload?.order?.entity?.id;
  const razorpayPaymentId = payload.payload?.payment?.entity?.id;
  const payment = razorpayOrderId
    ? await findPaymentByRazorpayOrderId(razorpayOrderId)
    : razorpayPaymentId
      ? await findPaymentByRazorpayPaymentId(razorpayPaymentId)
      : null;

  // Persisting the event id first makes the webhook retry-safe.
  const isNewEvent = await storeWebhookEventIfNew({
    eventId,
    eventType: payload.event,
    paymentId: payment?.paymentId,
    orderId: payment?.orderId,
    payload: payload as unknown as Prisma.InputJsonValue,
  });

  if (!isNewEvent) {
    return {
      processed: false,
      reason: "duplicate",
    };
  }

  if (!payment) {
    return {
      processed: false,
      reason: "payment_not_found",
    };
  }

  if (payload.event === "payment.captured" || payload.event === "order.paid") {
    await markPaymentVerifiedAndHeld({
      orderId: payment.orderId,
      razorpayOrderId: payment.razorpayOrderId ?? razorpayOrderId,
      razorpayPaymentId:
        payment.razorpayPaymentId ??
        razorpayPaymentId ??
        "webhook_missing_payment_id",
      razorpaySignature: payment.razorpaySignature ?? signature,
      method: payload.payload?.payment?.entity?.method,
    });

    return {
      processed: true,
      reason: "marked_held",
    };
  }

  if (payload.event === "payment.failed") {
    await markPaymentFailed({
      orderId: payment.orderId,
      failureReason:
        payload.payload?.payment?.entity?.error_description ?? "Payment failed",
    });

    return {
      processed: true,
      reason: "marked_failed",
    };
  }

  return {
    processed: true,
    reason: "ignored",
  };
};

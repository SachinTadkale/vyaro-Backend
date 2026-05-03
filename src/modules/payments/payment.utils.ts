/**
 * Module: Payment.utils
 * Purpose: Implements the Payment.utils module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import crypto from "crypto";
import ApiError from "../../utils/apiError";

/**
 * Default Currency.
 */
export const DEFAULT_CURRENCY = "INR";

/**
 * To Paise.
 */
export const toPaise = (amount: number) => {
  const paise = Math.round(amount * 100);

  if (!Number.isFinite(paise) || paise <= 0) {
    throw new ApiError(400, "Payment amount must be greater than zero", {
      code: "INVALID_PAYMENT_AMOUNT",
    });
  }

  return paise;
};

/**
 * Build Basic Auth Header.
 */
export const buildBasicAuthHeader = (keyId: string, keySecret: string) => {
  const token = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  return `Basic ${token}`;
};

/**
 * Verify Checkout Signature.
 */
export const verifyCheckoutSignature = ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  keySecret,
}: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  keySecret: string;
}) => {
  const digest = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (digest.length !== razorpaySignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(digest),
    Buffer.from(razorpaySignature),
  );
};

/**
 * Verify Webhook Signature.
 */
export const verifyWebhookSignature = ({
  payload,
  signature,
  webhookSecret,
}: {
  payload: Buffer;
  signature: string;
  webhookSecret: string;
}) => {
  const digest = crypto
    .createHmac("sha256", webhookSecret)
    .update(payload)
    .digest("hex");

  if (digest.length !== signature.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
};

/**
 * Parse Webhook Payload.
 */
export const parseWebhookPayload = <T>(payload: Buffer) => {
  try {
    return JSON.parse(payload.toString("utf8")) as T;
  } catch {
    throw new ApiError(400, "Invalid webhook payload", {
      code: "INVALID_WEBHOOK_PAYLOAD",
    });
  }
};

/**
 * Build Receipt.
 */
export const buildReceipt = (orderId: string) => {
  const compact = orderId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 28);
  return `farmzy_${compact}`;
};

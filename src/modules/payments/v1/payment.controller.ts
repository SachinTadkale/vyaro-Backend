/**
 * Module: Payment.controller
 * Purpose: Implements the Payment.controller module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { Request, Response } from "express";
import asyncHandler from "../../../utils/asyncHandler";
import {
  createPaymentOrder,
  getPaymentDetails,
  handleWebhook,
  releasePayment,
  verifyPayment,
} from "../payment.service";
import notificationService from "../../notification/notification.service";
import { NotificationEventType } from "../../notification/notification.types";
import {
  createPaymentOrderSchema,
  paymentOrderParamSchema,
  releasePaymentParamSchema,
  releasePaymentSchema,
  validateSchema,
  verifyPaymentSchema,
} from "../payment.validation";

/**
 * Create Payment Order Controller.
 */
export const createPaymentOrderController = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = validateSchema(createPaymentOrderSchema, {
      ...req.body,
      idempotencyKey:
        req.body?.idempotencyKey ?? req.header("x-idempotency-key") ?? undefined,
    });
    const result = await createPaymentOrder(req.user.companyId, payload);

    res.status(201).json({
      success: true,
      message: result.isExistingOrder
        ? "Existing payment order returned successfully"
        : "Payment order created successfully",
      data: result,
    });
  },
);

/**
 * Verify Payment Controller.
 */
export const verifyPaymentController = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = validateSchema(verifyPaymentSchema, req.body);
    const result = await verifyPayment(req.user.companyId, payload);
    if (result.notificationPayload) {
      void notificationService.sendNotification(
        NotificationEventType.PAYMENT_SUCCESS,
        result.notificationPayload,
      );
    }

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: result,
    });
  },
);

/**
 * Get Payment Details Controller.
 */
export const getPaymentDetailsController = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = validateSchema(paymentOrderParamSchema, req.params);
    const result = await getPaymentDetails(orderId, req.user);

    res.status(200).json({
      success: true,
      data: result,
    });
  },
);

/**
 * Release Payment Controller.
 */
export const releasePaymentController = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = validateSchema(releasePaymentParamSchema, req.params);
    const payload = validateSchema(releasePaymentSchema, req.body);
    const result = await releasePayment(orderId, payload);

    res.status(200).json({
      success: true,
      message: "Payment released successfully",
      data: result,
    });
  },
);

/**
 * Razorpay Webhook Controller.
 */
export const razorpayWebhookController = asyncHandler(
  async (req: Request, res: Response) => {
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(JSON.stringify(req.body ?? {}));
    const signature = req.header("x-razorpay-signature") ?? undefined;
    const eventId = req.header("x-razorpay-event-id") ?? undefined;

    const result = await handleWebhook(rawBody, signature, eventId);
    if (
      result.notificationEvent &&
      result.notificationPayload &&
      result.notificationEvent in NotificationEventType
    ) {
      void notificationService.sendNotification(
        NotificationEventType[
          result.notificationEvent as keyof typeof NotificationEventType
        ],
        result.notificationPayload,
      );
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  },
);

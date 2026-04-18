import { Router } from "express";
import { authMiddleware } from "../../../middleware/auth.middleware";
import { adminOnly } from "../../../middleware/admin.middleware";
import { createRateLimiter } from "../../../middleware/rateLimit.middleware";
import { requireActor } from "../../../middleware/rbac.middleware";
import {
  createPaymentOrderController,
  getPaymentDetailsController,
  razorpayWebhookController,
  releasePaymentController,
  verifyPaymentController,
} from "./payment.controller";

const paymentCreateLimiter = createRateLimiter({
  keyPrefix: "payment-create-order",
  windowMs: 60 * 1000,
  maxRequests: 10,
});

const paymentVerifyLimiter = createRateLimiter({
  keyPrefix: "payment-verify",
  windowMs: 60 * 1000,
  maxRequests: 15,
});

const paymentRouter = Router();
const webhookRouter = Router();

paymentRouter.post(
  "/create-order",
  authMiddleware,
  requireActor("COMPANY"),
  paymentCreateLimiter,
  createPaymentOrderController,
);

paymentRouter.post(
  "/verify",
  authMiddleware,
  requireActor("COMPANY"),
  paymentVerifyLimiter,
  verifyPaymentController,
);

paymentRouter.get("/:orderId", authMiddleware, getPaymentDetailsController);

paymentRouter.post(
  "/release/:orderId",
  authMiddleware,
  adminOnly,
  releasePaymentController,
);

webhookRouter.post("/razorpay", razorpayWebhookController);

export { webhookRouter as paymentWebhookRoutes };
export default paymentRouter;

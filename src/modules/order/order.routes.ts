import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { createRateLimiter } from "../../middleware/rateLimit.middleware";
import { requireActor } from "../../middleware/rbac.middleware";
import { verifiedOnly } from "../../middleware/verification.middleware";
import {
  acceptOrder,
  cancelOrder,
  createOrder,
  getCompanyOrderById,
  getCompanyOrders,
  rejectOrder,
} from "./order.controller";

const router = Router();

const companyOrderMutationLimiter = createRateLimiter({
  keyPrefix: "company-order-mutation",
  windowMs: 60 * 1000,
  maxRequests: 20,
});

const farmerOrderDecisionLimiter = createRateLimiter({
  keyPrefix: "farmer-order-decision",
  windowMs: 60 * 1000,
  maxRequests: 30,
});

router.post(
  "/company/createOrder",
  authMiddleware,
  requireActor("COMPANY"),
  companyOrderMutationLimiter,
  createOrder,
);

router.get(
  "/company/getCompanyorders",
  authMiddleware,
  requireActor("COMPANY"),
  getCompanyOrders,
);

router.get(
  "/company/getCompanyOrderById/:id",
  authMiddleware,
  requireActor("COMPANY"),
  getCompanyOrderById,
);

router.patch(
  "/company/:id/cancel",
  authMiddleware,
  requireActor("COMPANY"),
  companyOrderMutationLimiter,
  cancelOrder,
);

router.patch(
  "/farmer/:id/accept",
  authMiddleware,
  requireActor("USER"),
  verifiedOnly,
  farmerOrderDecisionLimiter,
  acceptOrder,
);

router.patch(
  "/farmer/:id/reject",
  authMiddleware,
  requireActor("USER"),
  verifiedOnly,
  farmerOrderDecisionLimiter,
  rejectOrder,
);

export default router;

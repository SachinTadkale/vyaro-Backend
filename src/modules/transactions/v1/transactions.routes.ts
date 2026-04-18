import { Router } from "express";
import { authMiddleware } from "../../../middleware/auth.middleware";
import { getTransactionsController } from "./transactions.controller";
import { createRateLimiter } from "../../../middleware/rateLimit.middleware";

const router = Router();

const TransactionReadLimiter = createRateLimiter({
  keyPrefix: "transaction-read",
  windowMs: 60 * 1000,
  maxRequests: 120,
});

router.get(
  "/getTransactions",
  TransactionReadLimiter,
  authMiddleware,
  getTransactionsController,
);

export default router;

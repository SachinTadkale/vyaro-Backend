/**
 * Module: Express Application
 * Purpose: Configures the FarmZy backend HTTP pipeline, middleware stack, and route mounting.
 * Used by: src/server.ts
 */
import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import v1Routes from "./routes/v1";
import paymentWebhookRoutes from "./modules/payments/v1/payment.routes";
import { createRateLimiter } from "./middleware/rateLimit.middleware";
import { errorHandler } from "./middleware/error.middleware";
import { requestLogger } from "./middleware/requestLogger";
import { langMiddleware } from "./middleware/lang.middleware";
import cron from "node-cron";
import {expireDeliveries } from "./cron/delivery.cron";

const API_PREFIX = "/api/v1";
const expressApp = express();
const parseAllowedOrigins = () =>
  [
    process.env.APP_BASE_URL,
    process.env.USER_APP_URL,
    process.env.COMPANY_APP_URL,
    process.env.DELIVERY_APP_URL,
    process.env.ADMIN_APP_URL,
    ...(process.env.CORS_ALLOWED_ORIGINS?.split(",") ?? []),
  ]
    .map((origin) => origin?.trim())
    .filter((origin): origin is string => Boolean(origin));

const allowedOrigins = new Set(parseAllowedOrigins());
const globalApiLimiter = createRateLimiter({
  keyPrefix: "global-api",
  windowMs: 60 * 1000,
  maxRequests: 300,
});
const webhookLimiter = createRateLimiter({
  keyPrefix: "webhook-api",
  windowMs: 60 * 1000,
  maxRequests: 120,
});

expressApp.disable("x-powered-by");
if (process.env.TRUST_PROXY === "true") {
  expressApp.set("trust proxy", true);
}

expressApp.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
expressApp.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (process.env.NODE_ENV !== "production" || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
  }),
);
expressApp.use(morgan("dev"));
// Razorpay signs the raw webhook body, so this route must be mounted before JSON parsing.
expressApp.use(
  "/webhooks",
  webhookLimiter,
  express.raw({ type: "application/json", limit: "256kb" }),
  paymentWebhookRoutes,
);
expressApp.use(express.json({ limit: "100kb" }));
expressApp.use(express.urlencoded({ extended: false, limit: "100kb" }));

// Resolve x-lang header → req.lang for all downstream controllers
expressApp.use(langMiddleware);

expressApp.use(API_PREFIX, globalApiLimiter, v1Routes);

/* ---------------- 404 HANDLER ---------------- */

expressApp.use((request: Request, response: Response) => {
  response.status(404).json({
    success: false,
    message: "Route Not Found",
  });
});

expressApp.use(errorHandler);
expressApp.use(requestLogger);

// Run every 5 minutes
cron.schedule("*/5 * * * *", async () => {
  console.log("Running delivery expiry...");
  await expireDeliveries();
});

export default expressApp;

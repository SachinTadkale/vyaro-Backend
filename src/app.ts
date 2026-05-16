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
import { initMarketRatesCron } from "./modules/market-rates/v1/market-rate.cron";
import { initDeliveryCron } from "./cron/delivery.cron";
import { globalRouteGuard } from "./middleware/route-guard.middleware";
import { precomputeAppConfigSnapshot } from "./modules/app-config/v1/app-config.controller";
import { systemSettingsService } from "./modules/system-settings/v1/system-setting.service";

const API_PREFIX = "/api/v1";
const expressApp = express();
const parseAllowedOrigins = () =>
  [
    process.env.WEB_APP_URL_DEV,
    process.env.WEB_APP_URL_PROD,
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
expressApp.use(
  morgan("dev", {
    skip: (req, res) => {
      const isProduction = process.env.NODE_ENV === "production";
      if (!isProduction) return false;

      // Suppress successful (2xx/3xx) logs for app-config and system-settings
      const url = req.originalUrl || req.url || "";
      const isOperational = 
        url.includes("/app-config") || 
        url.includes("/system-settings");

      return isOperational && res.statusCode < 400;
    }
  })
);
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

// Global route-level toggle + maintenance mode guard
// Must run AFTER auth middleware wires req.user (via authenticate in routes),
// so we mount it just before the v1 routes as a pass-through check.
expressApp.use(API_PREFIX, globalRouteGuard);

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

// ─── Boot Sequence ────────────────────────────────────────────────────────────

// 1. Initialize runtime-controlled cron jobs
initMarketRatesCron();
initDeliveryCron();

// 2. Warm up all platform caches on server boot (populated asynchronously)
Promise.all([
  precomputeAppConfigSnapshot().catch(() => {}),
  systemSettingsService.getAll().catch(() => {}),
  systemSettingsService.getAllRouteToggles().catch(() => {}),
  systemSettingsService.getAllAudits().catch(() => {})
]).then(() => {
  console.log("🔥 Operational settings, route toggles, audits, and app-config caches fully warmed up!");
}).catch((err) => {
  console.error("Failed to warm up platform caches on boot:", err.message);
});

export default expressApp;

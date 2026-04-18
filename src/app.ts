import express, { Request, Response} from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import v1Routes from './routes/v1';
import paymentWebhookRoutes from "./modules/payments/v1/payment.routes";
import { createRateLimiter } from "./middleware/rateLimit.middleware";
import { errorHandler } from "./middleware/error.middleware";

const API_PREFIX = "/api/v1";
const app = express();
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

app.disable("x-powered-by");
if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", true);
}

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (
        process.env.NODE_ENV !== "production" ||
        allowedOrigins.has(origin)
      ) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
  }),
);
app.use(morgan("dev"));
// Razorpay signs the raw webhook body, so this route must be mounted before JSON parsing.
app.use(
  "/webhooks",
  webhookLimiter,
  express.raw({ type: "application/json", limit: "256kb" }),
  paymentWebhookRoutes,
);
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

app.use(API_PREFIX, globalApiLimiter,v1Routes);

/* ---------------- 404 HANDLER ---------------- */

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route Not Found",
  });
});

app.use(errorHandler);

export default app;

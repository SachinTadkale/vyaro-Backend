/**
 * Module: API v1 Router
 * Purpose: Aggregates all versioned backend modules under the /api/v1 prefix.
 * Used by: src/app.ts
 */
import { Router } from "express";

// Authentication routes for user, company, and admin sessions.
import userAuthRoutes from "../modules/auth/v1/user-auth.routes";
import companyAuthRoutes from "../modules/auth/v1/company-auth.routes";
import adminAuthRoutes from "../modules/auth/v1/admin-auth.routes";

// Admin management routes.
import adminRoutes from "../modules/admin/v1/admin.routes";

// Bank and company profile routes.
import bankRoutes from "../modules/banks/v1/bank.routes";
import companyRoutes from "../modules/companies/v1/company.routes";

// User profile and KYC routes.
import userRoutes from "../modules/users/v1/user.routes";
import kycRoutes from "../modules/kyc/v1/kyc.routes";
import deliveryKycRoutes from "../modules/kyc/v1/delivery-kyc.routes";

// Farming and marketplace routes.
import farmRoutes from "../modules/farms/v1/farm.routes";
import marketplaceRoutes from "../modules/marketplace/v1/marketplace.routes";
import marketRateRoutes from "../modules/market-rates/v1/market-rates.routes";
import productRoutes from "../modules/products/v1/product.routes";

// System Controls
import systemSettingRoutes from "../modules/system-settings/v1/system-setting.routes";

// Feature Guard middleware
import { featureGuard } from "../middleware/feature.middleware";

// Order, payment, and dispute routes.
import orderRoutes from "../modules/orders/v1/order.routes";
import paymentRoutes from "../modules/payments/v1/payment.routes";
import disputeRoutes from "../modules/disputes/v1/dispute.routes";

// Logistics and delivery partner routes.
import deliveryRoutes from "../modules/deliveries/v1/delivery.routes";
import deliveryPartnerRoutes from "../modules/delivery-partners/v1/delivery-partners.routes";

// Broadcast and lead-management routes.
import broadcastRoutes from "../modules/broadcasts/v1/broadcast.routes";
import leadsRoutes from "../modules/leads/v1/leads.routes";

// AI Assistant routes.
import aiRoutes from "../modules/ai-platform/routes/ai-platform.routes";

// Transaction routes.
import transactionRoutes from "../modules/transactions/v1/transactions.routes";
import { healthCheck } from "../modules/health/health.controller";
import testMailRoutes from "../modules/test_mail/test-mail.routes";

const apiV1Router = Router();

/* ---------------- HEALTH CHECK ---------------- */
apiV1Router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "FarmZy API v1.0.0",
    timestamp: new Date().toISOString()
  });
});

apiV1Router.use("/health", healthCheck);

/* ---------------- AUTH ---------------- */
apiV1Router.use("/auth/user", userAuthRoutes);
apiV1Router.use("/auth/company", companyAuthRoutes);
apiV1Router.use("/auth/admin", adminAuthRoutes);

/* ---------------- USERS & KYC ---------------- */
apiV1Router.use("/users", userRoutes);
apiV1Router.use("/kyc-records", kycRoutes);
apiV1Router.use("/delivery-kyc-records", deliveryKycRoutes);

/* ---------------- COMPANIES ---------------- */
apiV1Router.use("/companies", companyRoutes);

/* ---------------- ADMIN ---------------- */
apiV1Router.use("/admin", adminRoutes);

/* ---------------- SYSTEM CONTROLS ---------------- */
apiV1Router.use("/system-settings", systemSettingRoutes);

/* ---------------- FARMING ---------------- */
apiV1Router.use("/farms", farmRoutes);
apiV1Router.use("/marketplace",   featureGuard("ENABLE_MARKETPLACE"),   marketplaceRoutes);
apiV1Router.use("/market-rates",   featureGuard("ENABLE_MARKET_RATES"),  marketRateRoutes);
apiV1Router.use("/products", productRoutes);

/* ---------------- ORDERS & PAYMENTS ---------------- */
apiV1Router.use("/orders",       featureGuard("ENABLE_ORDERS"),   orderRoutes);
apiV1Router.use("/payments",     featureGuard("ENABLE_PAYMENTS"), paymentRoutes);
apiV1Router.use("/disputes", disputeRoutes);

/* ---------------- LOGISTICS ---------------- */
apiV1Router.use("/deliveries",         featureGuard("ENABLE_DELIVERY"), deliveryRoutes);
apiV1Router.use("/delivery-partners",  deliveryPartnerRoutes);

/* ---------------- TRANSACTIONS ---------------- */
apiV1Router.use("/transactions", transactionRoutes);

/* ---------------- APP CONFIG ---------------- */
// Public endpoint for frontend feature flags and UI visibility
import { getAppConfig } from "../modules/app-config/v1/app-config.controller";
apiV1Router.get("/app-config", getAppConfig);

/* ---------------- OTHER ---------------- */
apiV1Router.use("/banks", bankRoutes);
apiV1Router.use("/broadcasts", broadcastRoutes);
apiV1Router.use("/leads", leadsRoutes);
apiV1Router.use("/ai", featureGuard("ENABLE_AI"), aiRoutes);

/* ---------------- OTHER ---------------- */
apiV1Router.use('/test-mail',testMailRoutes);

export default apiV1Router;

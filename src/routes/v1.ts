import { Router } from "express";

// Auth
import userAuthRoutes from "../modules/auth/v1/user-auth.routes";
import companyAuthRoutes from "../modules/auth/v1/company-auth.routes";
import adminAuthRoutes from "../modules/auth/v1/admin-auth.routes";

// Admin
import adminRoutes from "../modules/admin/v1/admin.routes";

// Banks & Companies
import bankRoutes from "../modules/banks/v1/bank.routes";
import companyRoutes from "../modules/companies/v1/company.routes";

// Users & KYC
import userRoutes from "../modules/users/v1/user.routes";
import kycRoutes from "../modules/kyc/v1/kyc.routes";

// Farming & Marketplace
import farmRoutes from "../modules/farms/v1/farm.routes";
import marketplaceRoutes from "../modules/marketplace/v1/marketplace.routes";
import productRoutes from "../modules/products/v1/product.routes";

// Orders, Payments & Disputes
import orderRoutes from "../modules/orders/v1/order.routes";
import paymentRoutes from "../modules/payments/v1/payment.routes";
import disputeRoutes from "../modules/disputes/v1/dispute.routes";

// Logistics
import deliveryRoutes from "../modules/deliveries/v1/delivery.routes";
import deliveryPartnerRoutes from "../modules/delivery-partners/v1/delivery-partner.routes";

// Communication & CRM
import broadcastRoutes from "../modules/broadcasts/v1/broadcast.routes";
import leadsRoutes from "../modules/leads/v1/leads.routes";

const apiV1Router = Router();

/* ---------------- AUTH ---------------- */
apiV1Router.use("/auth/user", userAuthRoutes);
apiV1Router.use("/auth/company", companyAuthRoutes);
apiV1Router.use("/auth/admin", adminAuthRoutes);

/* ---------------- USERS & KYC ---------------- */
apiV1Router.use("/users", userRoutes);
apiV1Router.use("/kyc-records", kycRoutes);

/* ---------------- COMPANIES ---------------- */
apiV1Router.use("/companies", companyRoutes);

/* ---------------- ADMIN ---------------- */
apiV1Router.use("/admin", adminRoutes);

/* ---------------- FARMING ---------------- */
apiV1Router.use("/farms", farmRoutes);
apiV1Router.use("/marketplace", marketplaceRoutes);
apiV1Router.use("/products", productRoutes);

/* ---------------- ORDERS & PAYMENTS ---------------- */
apiV1Router.use("/orders", orderRoutes);
apiV1Router.use("/payments", paymentRoutes);
apiV1Router.use("/disputes", disputeRoutes);

/* ---------------- LOGISTICS ---------------- */
apiV1Router.use("/deliveries", deliveryRoutes);
apiV1Router.use("/delivery-partners", deliveryPartnerRoutes);

/* ---------------- OTHER ---------------- */
apiV1Router.use("/banks", bankRoutes);
apiV1Router.use("/broadcasts", broadcastRoutes);
apiV1Router.use("/leads", leadsRoutes);

export default apiV1Router;
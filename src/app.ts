import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import adminAuthRoutes from "./modules/admin-auth/admin-auth.routes";
import authRoutes from "./modules/auth/auth.routes";
import adminRoutes from "./modules/admin/admin.routes";
import bankRoutes from "./modules/bank/bank.routes";
import companyAuthRoutes from "./modules/company-auth/company-auth.routes";
import farmRoutes from "./modules/farm/farm.routes";
import kycRoutes from "./modules/kyc/kyc.routes";
import leadsRoutes from "./modules/leads/leads.routes";
import productRoutes from "./modules/product/product.routes";
import userRoutes from "./modules/user/user.routes";
import marketplaceRoutes from "./modules/marketplace/marketplace.routes";
import { errorHandler } from "./middleware/error.middleware";

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(morgan("dev"));
app.use(express.json());

/* ---------------- ROUTES ---------------- */

app.use("/api/admin-auth", adminAuthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/bank", bankRoutes);
app.use("/api/companyAuth", companyAuthRoutes);
app.use("/api/farm", farmRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/leads", leadsRoutes);
app.use("/api/product", productRoutes);
app.use("/api/user", userRoutes);
app.use("/api/marketplace", marketplaceRoutes);

/* ---------------- 404 HANDLER ---------------- */

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route Not Found",
  });
});

app.use(errorHandler);

export default app;

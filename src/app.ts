import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./modules/auth/auth.routes";
import adminRoutes from "./modules/admin/admin.routes";
import userRoutes from "./modules/user/user.routes";
import farmRoutes from "./modules/farm/farm.routes";
import bankRoutes from "./modules/bank/bank.routes";
import kycRoutes from "./modules/kyc/kyc.routes";
import productRoutes from "./modules/product/product.routes";

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

/* ---------------- ROUTES ---------------- */

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);
app.use("/api/farm", farmRoutes);
app.use("/api/bank", bankRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/products", productRoutes);


/* ---------------- HEALTH CHECK ---------------- */

app.get("/health", (req: Request, res: Response) => {
  res.send("FarmZy API Running ✅");
});

/* ---------------- 404 HANDLER ---------------- */

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route Not Found",
  });
});

export default app;

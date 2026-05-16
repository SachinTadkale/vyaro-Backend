/**
 * Module: Backend Server Bootstrap
 * Purpose: Loads environment configuration and starts the Express HTTP server.
 */
import dotenv from "dotenv";
import dns from "node:dns";

// Force IPv4 preference to resolve "IP version error" (ENOTFOUND/ESOCKET) in production (Railway)
dns.setDefaultResultOrder("ipv4first");

dotenv.config();

import app from "./app";
import prisma from "./config/prisma";
import { bootstrapRuntimeControls } from "./modules/system/system.bootstrap";

const serverPort = process.env.PORT || 5000;

async function bootstrapApp() {
  try {
    // 1. Explicitly connect DB to ensure infrastructure is ready
    await prisma.$connect();
    console.log("✅ Database connected successfully.");

    // 2. Initialize runtime controls (seeds defaults + prepares Redis)
    await bootstrapRuntimeControls();

    // 3. Start Express server only after infrastructure is ready
    app.listen(serverPort, () => {
      console.log(`🚀 Server running on port http://localhost:${serverPort}`);
    });
  } catch (error) {
    console.error("❌ Fatal Bootstrap Error: Server failed to start due to infrastructure failure.");
    console.error(error);
    process.exit(1);
  }
}

bootstrapApp();

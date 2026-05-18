/**
 * Module: Backend Server Bootstrap
 * Purpose: Loads environment configuration and starts the Express HTTP server.
 */
import dotenv from "dotenv";
import dns from "node:dns";

// Force IPv4 preference to resolve "IP version error" (ENOTFOUND/ESOCKET) in production (Railway)
dns.setDefaultResultOrder("ipv4first");

dotenv.config();

import http from "http";
import app from "./app";
import prisma from "./config/prisma";
import { initSocketServer } from "./config/socket";
import { bootstrapRuntimeControls } from "./modules/system/system.bootstrap";
import { bootstrapAiTemplates } from "./modules/ai/ai.bootstrap";

const serverPort = process.env.PORT || 5000;

async function bootstrapApp() {
  try {
    // 1. Explicitly connect DB to ensure infrastructure is ready
    await prisma.$connect();
    console.log("✅ Database connected successfully.");

    // 2. Initialize runtime controls (seeds defaults + prepares Redis)
    await bootstrapRuntimeControls();

    // 3. Seed AI templates dynamically
    await bootstrapAiTemplates();

    // 4. Wrap Express app with http server and boot Socket.IO real-time engine
    const server = http.createServer(app);
    initSocketServer(server);

    server.listen(serverPort, () => {
      console.log(`🚀 Server running on port http://localhost:${serverPort}`);
    });
  } catch (error) {
    console.error("❌ Fatal Bootstrap Error: Server failed to start due to infrastructure failure.");
    console.error(error);
    process.exit(1);
  }
}

bootstrapApp();

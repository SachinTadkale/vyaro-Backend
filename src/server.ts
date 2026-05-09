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

const serverPort = process.env.PORT || 5000;

app.listen(serverPort, () => {
  console.log(`Server running on port http://localhost:${serverPort}`);
});

/**
 * Module: Backend Server Bootstrap
 * Purpose: Loads environment configuration and starts the Express HTTP server.
 */
import dotenv from "dotenv";
dotenv.config();

import app from "./app";

const serverPort = process.env.PORT || 5000;

app.listen(serverPort, () => {
  console.log(`Server running on port http://localhost:${serverPort}`);
});

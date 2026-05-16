/**
 * Module: Request Logger
 * Purpose: Implements the Request Logger module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

/**
 * Request Logger.
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const url = req.url || "";
  const isOperational = url.includes("/app-config") || url.includes("/system-settings");
  const isProduction = process.env.NODE_ENV === "production";

  if (!(isOperational && isProduction)) {
    logger.info({
      method: req.method,
      url,
    });
  }

  next();
};
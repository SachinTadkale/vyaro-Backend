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
  logger.info({
    method: req.method,
    url: req.url,
  });

  next();
};
/**
 * Module: Error.middleware
 * Purpose: Implements the Error.middleware module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { Prisma } from "@prisma/client";
import { Request, Response, NextFunction } from "express";
import ApiError from "../utils/apiError";
import { logger } from "../utils/logger"; // ✅ add logger

/**
 * Error Handler.
 */
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // ✅ Structured logging instead of console.error
  logger.error({
    message: err.message,
    code: (err as any).code,
    path: req.path,
    method: req.method,
    details: (err as any).details,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });

  /* -------------------------------------------------------------------------- */
  /*                          CUSTOM API ERROR                                  */
  /* -------------------------------------------------------------------------- */

  if (err instanceof ApiError && err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.code ? { code: err.code } : {}),

      // ✅ Always return validation errors cleanly
      ...(err.details
        ? {
            details: err.details,
          }
        : {}),
    });
  }

  /* -------------------------------------------------------------------------- */
  /*                          PRISMA ERRORS                                     */
  /* -------------------------------------------------------------------------- */

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Resource already exists",
        code: "RESOURCE_CONFLICT",
      });
    }

    if (err.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
        code: "RESOURCE_NOT_FOUND",
      });
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                          FALLBACK ERROR                                    */
  /* -------------------------------------------------------------------------- */

  return res.status(500).json({
    success: false,
    message: "Something went wrong. Please try again later.",
    ...(process.env.NODE_ENV === "development"
      ? { error: err.message }
      : {}),
  });
};
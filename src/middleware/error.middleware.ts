import { Prisma } from "@prisma/client";
import { Request, Response, NextFunction } from "express";
import ApiError from "../utils/apiError";

export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error("ERROR:", err);

  if (err instanceof ApiError && err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.code ? { code: err.code } : {}),
      ...(process.env.NODE_ENV !== "production" &&
      err.details !== undefined &&
      typeof err.details === "object" &&
      !Array.isArray(err.details)
        ? err.details
        : {}),
      ...(process.env.NODE_ENV !== "production" &&
      err.details !== undefined &&
      (typeof err.details !== "object" || Array.isArray(err.details))
        ? { details: err.details }
        : {}),
    });
  }

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

  return res.status(500).json({
    success: false,
    message: "Something went wrong. Please try again later.",
  });
};

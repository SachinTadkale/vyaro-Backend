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

  return res.status(500).json({
    success: false,
    message: "Something went wrong. Please try again later.",
  });
};

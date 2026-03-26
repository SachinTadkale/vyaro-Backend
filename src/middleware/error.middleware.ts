import { Request, Response, NextFunction } from "express";
import ApiError from "../utils/apiError";

export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const statusCode = err instanceof ApiError ? err.statusCode : 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(err instanceof ApiError && err.code ? { code: err.code } : {}),
    ...(err instanceof ApiError &&
    err.details !== undefined &&
    typeof err.details === "object" &&
    !Array.isArray(err.details)
      ? err.details
      : {}),
    ...(err instanceof ApiError &&
    err.details !== undefined &&
    (typeof err.details !== "object" || Array.isArray(err.details))
      ? { details: err.details }
      : {}),
  });
};

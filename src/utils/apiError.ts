/**
 * Module: Api Error
 * Purpose: Implements the Api Error module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
export default class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;
  details?: unknown;

  constructor(
    statusCode: number,
    message: string,
    options?: {
      code?: string;
      details?: unknown;
    },
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = options?.code;
    this.details = options?.details;
    Error.captureStackTrace(this, this.constructor);
  }
}

import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { logger } from "../utils/logger";

/**
 * Middleware: performanceMiddleware
 *
 * Captures request correlation IDs, calculates overall endpoint duration,
 * logs telemetry structured records, and flags slow database fallbacks or api bottlenecks (>500ms).
 */
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime();
  
  // 1. Correlation ID Generation / Extraction
  const correlationId = (req.headers["x-correlation-id"] as string) || crypto.randomUUID();
  (req as any).correlationId = correlationId;
  
  // Attach correlation ID to response headers
  res.setHeader("X-Correlation-Id", correlationId);

  // 2. Intercept Response Finish to Log Telemetry Metrics
  res.on("finish", () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const durationMs = parseFloat((seconds * 1000 + nanoseconds / 1000000).toFixed(2));
    
    const method = req.method.toUpperCase();
    const url = req.originalUrl || req.url;
    const status = res.statusCode;

    // Log structured operational telemetry
    const telemetry = {
      correlationId,
      method,
      url,
      status,
      durationMs,
      timestamp: new Date().toISOString()
    };

    if (durationMs > 500) {
      logger.warn({
        event: "slow_api_performance_alert",
        message: `API endpoint ${method} ${url} completed in ${durationMs}ms (threshold exceeded: 500ms)`,
        ...telemetry
      });
    } else {
      logger.info({
        event: "api_telemetry",
        ...telemetry
      });
    }
  });

  next();
};

import { NextFunction, Request, Response } from "express";
import ApiError from "../utils/apiError";

type RateLimitStoreEntry = {
  count: number;
  windowStart: number;
  expiresAt: number;
};

type RateLimitOptions = {
  keyPrefix: string;
  windowMs: number;
  maxRequests: number;
};

const rateLimitStore = new Map<string, RateLimitStoreEntry>();

setInterval(() => {
  const now = Date.now();

  for (const [key, value] of rateLimitStore.entries()) {
    if (now >= value.expiresAt) {
      rateLimitStore.delete(key);
    }
  }
}, 15 * 60 * 1000).unref();

export const createRateLimiter = ({
  keyPrefix,
  windowMs,
  maxRequests,
}: RateLimitOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const actorKey =
      req.user?.companyId ?? req.user?.userId ?? req.ip ?? "anonymous";
    const key = `${keyPrefix}:${actorKey}`;
    const now = Date.now();
    const existing = rateLimitStore.get(key);

    if (!existing || now - existing.windowStart >= windowMs) {
      const resetAt = now + windowMs;
      rateLimitStore.set(key, {
        count: 1,
        windowStart: now,
        expiresAt: resetAt,
      });
      res.setHeader("RateLimit-Limit", maxRequests.toString());
      res.setHeader("RateLimit-Remaining", Math.max(maxRequests - 1, 0).toString());
      res.setHeader("RateLimit-Reset", Math.ceil(resetAt / 1000).toString());

      return next();
    }

    const remaining = Math.max(maxRequests - existing.count, 0);
    res.setHeader("RateLimit-Limit", maxRequests.toString());
    res.setHeader("RateLimit-Remaining", remaining.toString());
    res.setHeader("RateLimit-Reset", Math.ceil(existing.expiresAt / 1000).toString());

    if (existing.count >= maxRequests) {
      res.setHeader(
        "Retry-After",
        Math.max(Math.ceil((existing.expiresAt - now) / 1000), 1).toString(),
      );
      return next(
        new ApiError(429, "Too many requests. Please try again shortly.", {
          code: "RATE_LIMIT_EXCEEDED",
        }),
      );
    }

    existing.count += 1;
    rateLimitStore.set(key, existing);
    res.setHeader("RateLimit-Remaining", Math.max(maxRequests - existing.count, 0).toString());

    return next();
  };
};

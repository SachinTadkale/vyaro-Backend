import { NextFunction, Request, Response } from "express";
import ApiError from "../utils/apiError";

type RateLimitStoreEntry = {
  count: number;
  windowStart: number;
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
    if (now - value.windowStart > 60 * 60 * 1000) {
      rateLimitStore.delete(key);
    }
  }
}, 15 * 60 * 1000).unref();

export const createRateLimiter = ({
  keyPrefix,
  windowMs,
  maxRequests,
}: RateLimitOptions) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const actorKey =
      req.user?.companyId ?? req.user?.userId ?? req.ip ?? "anonymous";
    const key = `${keyPrefix}:${actorKey}`;
    const now = Date.now();
    const existing = rateLimitStore.get(key);

    if (!existing || now - existing.windowStart >= windowMs) {
      rateLimitStore.set(key, {
        count: 1,
        windowStart: now,
      });

      return next();
    }

    if (existing.count >= maxRequests) {
      return next(
        new ApiError(429, "Too many requests. Please try again shortly.", {
          code: "RATE_LIMIT_EXCEEDED",
        }),
      );
    }

    existing.count += 1;
    rateLimitStore.set(key, existing);

    return next();
  };
};

import { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";

/**
 * Middleware: requireOwnerAccess
 *
 * Restricts access to OWNER role only.
 * Use this for system-critical controls: feature toggles, cron management,
 * maintenance mode, route toggles, and audit history.
 *
 * Security comes from JWT validation (authenticate middleware),
 * RBAC (this middleware), and a full audit trail — not obscurity.
 */
export const requireOwnerAccess = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.role !== UserRole.OWNER) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Owner-level access required.",
    });
  }
  next();
};

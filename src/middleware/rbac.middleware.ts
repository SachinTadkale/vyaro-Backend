/**
 * Module: Rbac.middleware
 * Purpose: Implements the Rbac.middleware module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { UserRole } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

type ActorType = "FARMER" | "COMPANY" | "DELIVERY_PARTNER";
type DeliveryAccessRole = "COMPANY" | "DELIVERY_PARTNER" | "ADMIN";

/**
 * Require Actor.
 */
export const requireActor = (...allowedActors: ActorType[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.actorType || !allowedActors.includes(req.user.actorType)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    next();
  };
};

/**
 * Require User Role.
 */
export const requireUserRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.role || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    next();
  };
};

/**
 * Require Delivery Access.
 */
export const requireDeliveryAccess = (
  ...allowedAccess: DeliveryAccessRole[]
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const accessChecks: Record<DeliveryAccessRole, boolean> = {
      COMPANY: req.user?.role === UserRole.COMPANY,
      DELIVERY_PARTNER: req.user?.role === UserRole.DELIVERY_PARTNER,
      ADMIN: req.user?.role === UserRole.ADMIN || req.user?.role === UserRole.OWNER,
    };

    const hasAccess = allowedAccess.some((access) => accessChecks[access]);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    next();
  };
};

/**
 * Module: Admin.middleware
 * Purpose: Implements the Admin.middleware module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { UserRole } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

/**
 * Admin Only.
 */
export const adminOnly = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.OWNER)) {
    return res.status(403).json({
      message: "Admin or Owner access required",
    });
  }

  next();
};

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
  if (req.user.role !== UserRole.ADMIN) {
    return res.status(403).json({
      message: "Admin access required",
    });
  }

  next();
};

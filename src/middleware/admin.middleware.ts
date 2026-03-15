import { UserRole } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

export const adminOnly = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.user.role !== UserRole.ADMIN) {
    return res.status(403).json({
      message: "Access denied. Admin only.",
    });
  }

  next();
};

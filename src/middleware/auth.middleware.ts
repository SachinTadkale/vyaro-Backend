import { NextFunction, Request, Response } from "express";
import { JwtPayload, verifyToken } from "../lib/jwt";
import { UserRole } from "@prisma/client";

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      success: false,
      message: "Invalid authorization header",
    });
  }

  try {
    const decoded: JwtPayload = verifyToken(token);

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      companyId: decoded.companyId,
      actorType:
        decoded.actorType ??
        (decoded.role === UserRole.COMPANY
          ? "COMPANY"
          : decoded.role === UserRole.DELIVERY_PARTNER
            ? "DELIVERY_PARTNER"
            : "USER"),
    };

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

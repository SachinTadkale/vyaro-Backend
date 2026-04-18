import { NextFunction, Request, Response } from "express";
import { JwtPayload, verifyToken } from "../lib/jwt";

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
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
      actorType: decoded.actorType ?? (decoded.companyId ? "COMPANY" : "USER"),
    };

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

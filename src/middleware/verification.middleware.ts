import { VerificationStatus } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import prisma from "../config/prisma";

export const verifiedOnly = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = await prisma.user.findUnique({
    where: { user_id: req.user.userId },
  });

  if (!user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  if (user.verificationStatus !== VerificationStatus.VERIFIED) {
    return res.status(403).json({
      message: "Account verification required. Please wait for review.",
    });
  }

  next();
};

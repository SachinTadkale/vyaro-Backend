/**
 * Module: Delivery.middleware
 * Purpose: Implements the Delivery.middleware module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { NextFunction, Request, Response } from "express";
import prisma from "../config/prisma";

/**
 * Require Delivery Ownership.
 */
export const requireDeliveryOwnership = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const deliveryId = req.params.deliveryId; // keep consistent naming

    const delivery = await prisma.delivery.findUnique({
      where: { deliveryId },
      include: { partner: true },
    });

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: "Delivery not found",
      });
    }

    if (delivery.partnerId !== req.user?.userId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    next();
  };
};

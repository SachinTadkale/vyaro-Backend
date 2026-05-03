/**
 * Module: Transactions.controller
 * Purpose: Implements the Transactions.controller module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { Request, Response } from "express";
import asyncHandler from "../../../utils/asyncHandler";
import { getTransactions } from "../transactions.service";
import ApiError from "../../../utils/apiError";

const ACTOR_TYPES = ["FARMER", "COMPANY", "DELIVERY_PARTNER"] as const;
/**
 * Get Transactions Controller.
 */
export const getTransactionsController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user.actorType || !ACTOR_TYPES.includes(req.user.actorType)) {
      throw new ApiError(400, "Actor Type Missing");
    }
    const result = await getTransactions(
      {
        userId: req.user.userId,
        companyId: req.user.companyId,
        actorType: req.user.actorType,
      },
      req.query,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  },
);

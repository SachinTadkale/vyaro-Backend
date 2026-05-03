/**
 * Module: Dispute.controller
 * Purpose: Implements the Dispute.controller module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { Request, Response } from "express";
import asyncHandler from "../../../utils/asyncHandler";
import { createDispute, getDispute, resolveDispute } from "../dispute.service";
import {
  createDisputeSchema,
  disputeIdParamSchema,
  resolveDisputeSchema,
  validateSchema,
} from "../dispute.schema";

/**
 * Create Dispute Controller.
 */
export const createDisputeController = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = validateSchema(createDisputeSchema, req.body);
    const result = await createDispute(req.user, payload);

    res.status(201).json({
      success: true,
      message: "Dispute created successfully",
      data: result,
    });
  },
);

/**
 * Get Dispute Controller.
 */
export const getDisputeController = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = validateSchema(disputeIdParamSchema, req.params);
    const result = await getDispute(req.user, id);

    res.status(200).json({
      success: true,
      data: result,
    });
  },
);

/**
 * Resolve Dispute Controller.
 */
export const resolveDisputeController = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = validateSchema(disputeIdParamSchema, req.params);
    const payload = validateSchema(resolveDisputeSchema, req.body);
    const result = await resolveDispute(req.user, id, payload);

    res.status(200).json({
      success: true,
      message: "Dispute resolved successfully",
      data: result,
    });
  },
);

/**
 * Module: Broadcast.controller
 * Purpose: Implements the Broadcast.controller module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { Request, Response } from "express";
import asyncHandler from "../../../utils/asyncHandler";
import broadcastService from "../broadcast.service";

/**
 * Create Broadcast Controller.
 */
export const createBroadcastController = asyncHandler(
  async (req: Request, res: Response) => {
    const broadcast = await broadcastService.createBroadcast(req.user.userId, req.body);

    res.status(201).json({
      success: true,
      message: "Broadcast created successfully",
      data: broadcast,
    });
  }
);

/**
 * List Broadcasts Controller.
 */
export const listBroadcastsController = asyncHandler(
  async (req: Request, res: Response) => {
    const broadcasts = await broadcastService.listBroadcasts({
      type: req.query.type as any,
      targetAudience: req.query.targetAudience as any,
      isActive:
        req.query.isActive !== undefined
          ? String(req.query.isActive).toLowerCase() === "true"
          : undefined,
    });

    res.status(200).json({
      success: true,
      data: broadcasts,
    });
  }
);

/**
 * Update Broadcast Controller.
 */
export const updateBroadcastController = asyncHandler(
  async (req: Request, res: Response) => {
    const broadcast = await broadcastService.updateBroadcast(req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: "Broadcast updated successfully",
      data: broadcast,
    });
  }
);

/**
 * Delete Broadcast Controller.
 */
export const deleteBroadcastController = asyncHandler(
  async (req: Request, res: Response) => {
    const broadcast = await broadcastService.deleteBroadcast(req.params.id);

    res.status(200).json({
      success: true,
      message: "Broadcast deactivated successfully",
      data: broadcast,
    });
  }
);

/**
 * Get Active Broadcasts Controller.
 */
export const getActiveBroadcastsController = asyncHandler(
  async (req: Request, res: Response) => {
    const broadcasts = await broadcastService.getActiveBroadcasts(req.user);

    res.status(200).json({
      success: true,
      data: broadcasts,
    });
  }
);

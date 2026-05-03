/**
 * Module: Delivery.controller
 * Purpose: Implements the Delivery.controller module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { Request, Response } from "express";
import asyncHandler from "../../../utils/asyncHandler";
import {
  acceptJob,
  assignDelivery,
  autoAssignDelivery,
  getActiveDeliveries,
  getAvailableJobs,
  getDashboard,
  getDelivery,
  updateDeliveryStatus,
} from "../delivery.service";
import {
  assignDeliverySchema,
  deliveryIdParamSchema,
  validateSchema,
} from "../delivery.schema";
import { updateStatusSchema } from "../delivery.schema";

/**
 * Assign Delivery Controller.
 */
export const assignDeliveryController = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = validateSchema(assignDeliverySchema, {
      ...req.body,
      idempotencyKey:
        req.body?.idempotencyKey ??
        req.header("x-idempotency-key") ??
        undefined,
    });
    const result = await assignDelivery(req.user, payload);

    res.status(result.isExistingDelivery ? 200 : 201).json({
      success: true,
      message: result.isExistingDelivery
        ? "Existing delivery assignment returned successfully"
        : "Delivery assigned successfully",
      data: result.delivery,
    });
  },
);

/**
 * Auto Assign Delivery Controller.
 */
export const autoAssignDeliveryController = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = validateSchema(
      assignDeliverySchema.pick({ orderId: true }),
      req.body,
    );
    const result = await autoAssignDelivery(req.user, orderId);

    res.status(result.isExistingDelivery ? 200 : 201).json({
      success: true,
      message: result.isExistingDelivery
        ? "Existing delivery assignment returned successfully"
        : "Delivery auto-assigned successfully",
      data: result.delivery,
    });
  },
);

/**
 * Update Delivery Status Controller.
 */
export const updateDeliveryStatusController = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = validateSchema(deliveryIdParamSchema, req.params);
    const payload = validateSchema(updateStatusSchema, req.body);
    const result = await updateDeliveryStatus(req.user, id, payload);

    res.status(200).json({
      success: true,
      message: result.isNoop
        ? "Delivery status already up to date"
        : "Delivery status updated successfully",
      data: result.delivery,
    });
  },
);

/**
 * Get Delivery Controller.
 */
export const getDeliveryController = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = validateSchema(deliveryIdParamSchema, req.params);
    const result = await getDelivery(req.user, id);

    res.status(200).json({
      success: true,
      data: result,
    });
  },
);

export const getJobsController = asyncHandler(async (req, res) => {
  const data = await getAvailableJobs(req.user);
  res.json({ success: true, data });
});

export const acceptJobController = asyncHandler(async (req, res) => {
  const data = await acceptJob(req.user, req.params.id);
  res.json({ success: true, data });
});

export const getActiveController = asyncHandler(async (req, res) => {
  const data = await getActiveDeliveries(req.user);
  res.json({ success: true, data });
});

export const getDashboardController = asyncHandler(async (req, res) => {
  const data = await getDashboard(req.user);
  res.json({ success: true, data });
});

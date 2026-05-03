/**
 * Module: Delivery Partner Controller
 * Purpose: Handles delivery partner profile, availability, jobs, and location workflows.
 * Used by: delivery-partners.routes.ts
 */
import { Request, Response } from "express";
import asyncHandler from "../../../utils/asyncHandler";
import {
  createProfile,
  getJobs,
  getProfile,
  updateAvailability,
  updateLocation,
} from "../delivery-partners.service";
import {
  createProfileSchema,
  updateAvailabilitySchema,
  updateLocationSchema,
  validateSchema,
} from "../delivery-partners.schema";

/**
 * Create Delivery Partner Profile Controller.
 */
export const createDeliveryPartnerProfileController = asyncHandler(
  async (req: Request, response: Response) => {
    const payload = validateSchema(createProfileSchema, req.body);
    const result = await createProfile(req.user, payload);

    response.status(201).json({
      success: true,
      message: "Delivery partner profile created successfully",
      data: result,
    });
  },
);

/**
 * Get Delivery Partner Profile Controller.
 */
export const getDeliveryPartnerProfileController = asyncHandler(
  async (req: Request, response: Response) => {
    const result = await getProfile(req.user);

    response.status(200).json({
      success: true,
      data: result,
    });
  },
);

/**
 * Update Delivery Partner Availability Controller.
 */
export const updateDeliveryPartnerAvailabilityController = asyncHandler(
  async (req: Request, response: Response) => {
    const payload = validateSchema(updateAvailabilitySchema, req.body);
    const result = await updateAvailability(req.user, payload);

    response.status(200).json({
      success: true,
      message: "Availability updated successfully",
      data: result,
    });
  },
);

/**
 * Get Delivery Partner Jobs Controller.
 */
export const getDeliveryPartnerJobsController = asyncHandler(
  async (req: Request, response: Response) => {
    const result = await getJobs(req.user);

    response.status(200).json({
      success: true,
      data: result,
    });
  },
);

/**
 * Update Delivery Partner Location Controller.
 */
export const updateDeliveryPartnerLocationController = asyncHandler(
  async (req: Request, response: Response) => {
    const payload = validateSchema(updateLocationSchema, req.body);
    const result = await updateLocation(req.user, payload);

    response.status(200).json({
      success: true,
      message: "Location updated",
      data: result,
    });
  },
);

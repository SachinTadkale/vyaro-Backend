import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import {
  createProfile,
  getJobs,
  getProfile,
  updateAvailability,
} from "./deliveryPartner.service";
import {
  createProfileSchema,
  updateAvailabilitySchema,
  validateSchema,
} from "./deliveryPartner.schema";

export const createDeliveryPartnerProfileController = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = validateSchema(createProfileSchema, req.body);
    const result = await createProfile(req.user, payload);

    res.status(201).json({
      success: true,
      message: "Delivery partner profile created successfully",
      data: result,
    });
  },
);

export const getDeliveryPartnerProfileController = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await getProfile(req.user);

    res.status(200).json({
      success: true,
      data: result,
    });
  },
);

export const updateDeliveryPartnerAvailabilityController = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = validateSchema(updateAvailabilitySchema, req.body);
    const result = await updateAvailability(req.user, payload);

    res.status(200).json({
      success: true,
      message: "Availability updated successfully",
      data: result,
    });
  },
);

export const getDeliveryPartnerJobsController = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await getJobs(req.user);

    res.status(200).json({
      success: true,
      data: result,
    });
  },
);

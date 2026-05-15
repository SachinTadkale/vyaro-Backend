/**
 * Module: User.controller
 * Purpose: Implements the User.controller module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { Response } from "express";
import ApiError from "../../../utils/apiError";
import asyncHandler from "../../../utils/asyncHandler";
import * as uploadKycService from "../user.service";

/**
 * Upload Kyc.
 */
export const uploadKYC = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.userId;

  if (!req.file) {
    throw new ApiError(400, "Document image is required");
  }

  const result = await uploadKycService.uploadKycService(userId, req.file, req.body.docNo);

  return res.status(200).json({
    success: true,
    message: "KYC submitted successfully",
    data: result,
  });
});

/**
 * Update Profile Image.
 */
export const updateProfileImage = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.userId;

  if (!req.file) {
    throw new ApiError(400, "Profile image is required");
  }

  const result = await uploadKycService.updateProfileImage(userId, req.file);

  return res.status(200).json({
    success: true,
    message: "Profile image updated successfully",
    data: result,
  });
});

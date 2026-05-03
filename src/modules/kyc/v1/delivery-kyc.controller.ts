/**
 * Module: Delivery Kyc Controller
 * Purpose: Handles bulk delivery partner KYC uploads.
 * Used by: delivery-kyc.routes.ts
 */
import { Response } from "express";
import ApiError from "../../../utils/apiError";
import asyncHandler from "../../../utils/asyncHandler";
import { uploadToCloudinary } from "../../../config/cloudinary";
import * as kycService from "../kyc.service";

/**
 * Upload Delivery Kyc.
 */
export const uploadDeliveryKyc = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.userId;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  if (!req.body.idType || !req.body.idNumber) {
    throw new ApiError(400, "Identification type and number are required");
  }

  if (!files || !files.idFrontImage || !files.drivingLicenseImage || !files.rcImage) {
    throw new ApiError(400, "Missing required documents. Please upload ID front, Driving License, and RC.");
  }

  // Upload to Cloudinary sequentially to avoid overwhelming rate limits or if parallel is preferred:
  // Parallel upload for better performance
  const [idFrontUpload, licenseUpload, rcUpload] = await Promise.all([
    uploadToCloudinary(files.idFrontImage[0].path),
    uploadToCloudinary(files.drivingLicenseImage[0].path),
    uploadToCloudinary(files.rcImage[0].path),
  ]);

  let idBackUrl: string | undefined;
  if (files.idBackImage && files.idBackImage.length > 0) {
    const idBackUpload = await uploadToCloudinary(files.idBackImage[0].path);
    idBackUrl = idBackUpload.url;
  }

  const result = await kycService.createDeliveryKyc(userId, {
    idType: req.body.idType,
    idNumber: req.body.idNumber,
    idFrontUrl: idFrontUpload.url,
    idBackUrl,
    licenseUrl: licenseUpload.url,
    rcUrl: rcUpload.url,
  });

  return res.status(201).json({
    success: true,
    message: "Delivery KYC documents submitted successfully",
    data: result,
  });
});

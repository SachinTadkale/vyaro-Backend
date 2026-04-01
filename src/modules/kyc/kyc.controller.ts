import { Response } from "express";
import ApiError from "../../utils/apiError";
import asyncHandler from "../../utils/asyncHandler";
import { uploadToCloudinary } from "../../config/cloudinary";
import * as kycService from "./kyc.service";

export const uploadKyc = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.userId;

  if (!req.files || !req.files.frontImage) {
    throw new ApiError(400, "Front image is required");
  }

  const frontUpload = await uploadToCloudinary(req.files.frontImage[0].path);
  const frontImageUrl = frontUpload.url;

  let backImageUrl: string | undefined;

  if (req.files.backImage) {
    const backUpload = await uploadToCloudinary(req.files.backImage[0].path);
    backImageUrl = backUpload.url;
  }

  const kyc = await kycService.createKyc(
    userId,
    req.body,
    frontImageUrl,
    backImageUrl
  );

  return res.status(201).json({
    success: true,
    message: "KYC submitted successfully",
    data: kyc,
  });
});

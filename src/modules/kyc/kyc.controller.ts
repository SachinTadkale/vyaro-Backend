import { Request, Response } from "express";
import * as kycService from "./kyc.service";
import { uploadToCloudinary } from "../../config/cloudinary";

export const uploadKyc = async (
  req: any,
  res: Response
) => {
  try {
    const userId = req.user.userId;

    if (!req.files || !req.files.frontImage) {
      throw new Error("Front image is required");
    }

    // Upload front image
    const frontUpload = await uploadToCloudinary(
      req.files.frontImage[0].path
    );

    const frontImageUrl = frontUpload.url; // ✅ extract only URL

    let backImageUrl: string | undefined;

    if (req.files.backImage) {
      const backUpload = await uploadToCloudinary(
        req.files.backImage[0].path
      );

      backImageUrl = backUpload.url; // ✅ extract only URL
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
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

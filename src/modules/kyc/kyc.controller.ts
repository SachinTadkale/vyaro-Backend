import { Request, Response } from "express";
import * as kycService from "./kyc.service";
import { kycSchema } from "./kyc.validation";
import { uploadToCloudinary } from "../../config/cloudinary";

export const uploadKyc = async (req: Request, res: Response) => {
  const parsed = kycSchema.parse(req.body);

  const files = req.files as {
    frontImage?: Express.Multer.File[];
    backImage?: Express.Multer.File[];
  };

  if (!files?.frontImage) {
    return res.status(400).json({ message: "Front image is required" });
  }

  const frontUpload = await uploadToCloudinary(
    files.frontImage[0].path
  );

  let backUpload;

  if (files.backImage) {
    backUpload = await uploadToCloudinary(
      files.backImage[0].path
    );
  }

  const kyc = await kycService.createKyc(
    req.user.userId,
    parsed,
    frontUpload.url,
    backUpload?.url
  );

  res.status(201).json({
    success: true,
    data: kyc,
  });
};
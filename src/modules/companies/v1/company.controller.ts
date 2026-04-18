import { Request, Response } from "express";
import * as service from "../company.service";
import { uploadToCloudinary } from "../../../config/cloudinary";
import fs from "fs";
import ApiError from "../../../utils/apiError";
import asyncHandler from "../../../utils/asyncHandler";

export const getCompanyProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const companyId = req.user?.companyId;

    if (!companyId) {
      throw new ApiError(401, "Unauthorized");
    }

    const company = await service.getCompanyProfileService(companyId);

    res.status(200).json({
      success: true,
      data: company,
    });
  }
);

export const uploadProfileImage = asyncHandler(
  async (req: Request, res: Response) => {
    const companyId = req.user?.companyId;

    if (!companyId) {
      throw new ApiError(401, "Unauthorized");
    }

    const file = req.file;

    if (!file) {
      throw new ApiError(400, "Image file is required");
    }

    let uploadResult;

    try {
      uploadResult = await uploadToCloudinary(
        file.path,
        "farmzy/companies"
      );
    } finally {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }

    const updated = await service.updateCompanyProfileImageService(
      companyId,
      uploadResult!.url
    );

    res.status(200).json({
      success: true,
      data: updated,
    });
  }
);

export const deleteProfileImage = asyncHandler(
  async (req: Request, res: Response) => {
    const companyId = req.user?.companyId;

    if (!companyId) {
      throw new ApiError(401, "Unauthorized");
    }

    const updated = await service.deleteCompanyProfileImageService(companyId);

    res.status(200).json({
      success: true,
      data: updated,
    });
  }
);

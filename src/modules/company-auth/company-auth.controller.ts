import { Request, Response } from "express";
import * as service from "./company-auth.service";
import cloudinary from "../../config/cloudinary";
import fs from "fs";
import ApiError from "../../utils/apiError";
import asyncHandler from "../../utils/asyncHandler";

export const registerCompany = asyncHandler(
  async (req: Request, res: Response) => {
    const company = await service.registerCompanyService(req.body);

    res.status(201).json({
      success: true,
      data: company,
    });
  },
);

export const uploadDocuments = asyncHandler(
  async (req: Request, res: Response) => {
    const { companyId } = req.body;
    const files = req.files as {
      gst?: Express.Multer.File[];
      license?: Express.Multer.File[];
    };

    const gstFile = files?.gst?.[0];
    const licenseFile = files?.license?.[0];

    if (!gstFile || !licenseFile) {
      throw new ApiError(400, "GST and license documents are required");
    }

    const gstUpload = await cloudinary.uploader.upload(gstFile.path, {
      folder: "farmzy/company-docs",
    });

    const licenseUpload = await cloudinary.uploader.upload(licenseFile.path, {
      folder: "farmzy/company-docs",
    });

    fs.unlinkSync(gstFile.path);
    fs.unlinkSync(licenseFile.path);

    const company = await service.uploadDocsService(
      companyId,
      gstUpload.secure_url,
      licenseUpload.secure_url,
    );

    res.json({
      success: true,
      data: company,
    });
  },
);

export const loginCompany = asyncHandler(
  async (req: Request, res: Response) => {
    const { registrationNo, password } = req.body;

    const result = await service.loginCompanyService(registrationNo, password);

    res.status(200).json({
      success: true,
      data: result,
    });
  },
);

export const logoutCompany = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await service.logoutCompanyService();

    // If using cookies, we would clear them here using res.clearCookie("token")
    res.status(200).json({
      success: true,
      data: result,
    });
  },
);

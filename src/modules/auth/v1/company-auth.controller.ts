import { Request, Response } from "express";
import * as service from "../auth.service";
import cloudinary from "../../../config/cloudinary";
import fs from "fs";
import ApiError from "../../../utils/apiError";
import asyncHandler from "../../../utils/asyncHandler";
import {
  companyLoginSchema,
  registerCompanySchema,
  uploadCompanyDocumentsSchema,
  validateSchema,
} from "../company-auth.validation";

export const registerCompany = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = validateSchema(registerCompanySchema, req.body);
    const company = await service.registerCompany(payload);

    res.status(201).json({
      success: true,
      data: company,
    });
  },
);

export const uploadDocuments = asyncHandler(
  async (req: Request, res: Response) => {
    const { companyId } = validateSchema(uploadCompanyDocumentsSchema, req.body);
    const files = req.files as {
      gst?: Express.Multer.File[];
      license?: Express.Multer.File[];
    };

    const gstFile = files?.gst?.[0];
    const licenseFile = files?.license?.[0];

    if (!gstFile || !licenseFile) {
      throw new ApiError(400, "GST and license documents are required");
    }

    let gstUpload;
    let licenseUpload;

    try {
      gstUpload = await cloudinary.uploader.upload(gstFile.path, {
        folder: "farmzy/company-docs",
      });

      licenseUpload = await cloudinary.uploader.upload(licenseFile.path, {
        folder: "farmzy/company-docs",
      });
    } finally {
      for (const file of [gstFile, licenseFile]) {
        if (file?.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }

    const company = await service.uploadCompanyDocs(
      companyId,
      gstUpload!.secure_url,
      licenseUpload!.secure_url,
    );

    res.json({
      success: true,
      data: company,
    });
  },
);

export const loginCompany = asyncHandler(
  async (req: Request, res: Response) => {
    const { registrationNo, password } = validateSchema(companyLoginSchema, req.body);

    const result = await service.loginCompany(registrationNo, password);

    res.status(200).json({
      success: true,
      data: result,
    });
  },
);

export const logoutCompany = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await service.logoutCompany();

    // If using cookies, we would clear them here using res.clearCookie("token")
    res.status(200).json({
      success: true,
      data: result,
    });
  },
);

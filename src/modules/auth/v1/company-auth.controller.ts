/**
 * Module: Company Auth.controller
 * Purpose: HTTP layer for Company Auth — register, login, logout, and password reset flow.
 */
import { Request, Response } from "express";
import * as service from "../auth.service";
import cloudinary from "../../../config/cloudinary";
import fs from "fs";
import ApiError from "../../../utils/apiError";
import asyncHandler from "../../../utils/asyncHandler";
import {
  companyLoginSchema,
  companyForgotPasswordSchema,
  companyVerifyResetOtpSchema,
  companyResetPasswordSchema,
  registerCompanySchema,
  uploadCompanyDocumentsSchema,
  validateSchema,
} from "../company-auth.validation";
import notificationService from "../../notification/notification.service";
import { NotificationEventType } from "../../notification/notification.types";
/**
 * Register Company.
 */
export const registerCompany = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = validateSchema(registerCompanySchema, req.body);
    const result = await service.registerCompany(payload);

    if (result.notificationPayload) {
      void notificationService.sendNotification(
        NotificationEventType.COMPANY_REGISTERED,
        result.notificationPayload
      );
    }

    res.status(201).json({
      success: true,
      data: result.company,
    });
  },
);

/**
 * Upload Documents.
 */
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

/**
 * Login Company.
 */
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

/**
 * Logout Company.
 */
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

/* -------------------------------------------------------------------------- */
/*                        COMPANY PASSWORD RESET                               */
/* -------------------------------------------------------------------------- */

/**
 * Forgot Password — Step 1.
 * POST /auth/company/forgot-password
 *
 * Accepts { email }. Always returns a generic success response to prevent
 * account enumeration, even if the email does not exist.
 */
export const forgotCompanyPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = validateSchema(companyForgotPasswordSchema, req.body);
    const result = await service.forgotCompanyPassword(payload);

    res.status(200).json({
      success: true,
      data: result,
    });
  },
);

/**
 * Verify Reset OTP — Step 2.
 * POST /auth/company/verify-reset-otp
 *
 * Accepts { email, otp }. Validates the OTP and marks it as verified.
 * The reset-password step (step 3) requires this to have been completed.
 */
export const verifyCompanyResetOtp = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = validateSchema(companyVerifyResetOtpSchema, req.body);
    const result = await service.verifyCompanyResetOtp(payload);

    res.status(200).json({
      success: true,
      data: result,
    });
  },
);

/**
 * Reset Password — Step 3.
 * POST /auth/company/reset-password
 *
 * Accepts { email, otp, newPassword }.
 * Requires a verified OTP from step 2. Hashes and updates the password,
 * then invalidates all OTPs for this company to prevent replay.
 */
export const resetCompanyPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = validateSchema(companyResetPasswordSchema, req.body);
    const result = await service.resetCompanyPassword(payload);

    res.status(200).json({
      success: true,
      data: result,
    });
  },
);


import { Request, Response } from "express";
import * as adminAuthService from "../auth.service";
import asyncHandler from "../../../utils/asyncHandler";
import notificationService from "../../notification/notification.service";
import { NotificationEventType } from "../../notification/notification.types";
import {
  forgotPasswordAdminSchema,
  loginAdminSchema,
  resetPasswordAdminSchema,
  validateSchema,
} from "../admin-auth.validation";

export const loginAdminController = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = validateSchema(loginAdminSchema, req.body);
    const result = await adminAuthService.loginAdmin(payload);

    return res.status(200).json({
      success: true,
      token: result.token,
    });
  }
);

export const forgotPasswordAdminController = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = validateSchema(forgotPasswordAdminSchema, req.body);
    const result = await adminAuthService.forgotAdminPassword(payload);
    if (result.notificationPayload) {
      void notificationService.sendNotification(
        NotificationEventType.PASSWORD_RESET,
        result.notificationPayload,
      );
    }

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  }
);

export const resetPasswordAdminController = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = validateSchema(resetPasswordAdminSchema, req.body);
    const result = await adminAuthService.resetAdminPassword(payload);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  }
);

import { Request, Response } from "express";
import asyncHandler from "../../../utils/asyncHandler";
import * as authService from "../auth.service";
import notificationService from "../../notification/notification.service";
import { NotificationEventType } from "../../notification/notification.types";
import {
  forgotPasswordSchema,
  loginSchema,
  loginWithOtpSchema,
  registerSchema,
  requestOtpSchema,
  resetPasswordSchema,
  validateSchema,
} from "../user-auth.validation";

export const registerUser = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = validateSchema(registerSchema, req.body);
    const result = await authService.registerUser(payload);
    if (result.notificationPayload) {
      void notificationService.sendNotification(
        NotificationEventType.USER_REGISTERED,
        result.notificationPayload,
      );
    }

    return res.status(201).json({
      success: true,
      message: result.message,
      token: result.token,
      registrationStep: result.registrationStep,
      verificationStatus: result.verificationStatus,
      onboardingCompleted: result.onboardingCompleted,
    });
  },
);

export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const payload = validateSchema(loginSchema, req.body);
  const result = await authService.loginUser(payload);

  return res.status(200).json({
    success: true,
    token: result.token,
    registrationStep: result.registrationStep,
    verificationStatus: result.verificationStatus,
    onboardingCompleted: result.onboardingCompleted,
  });
});

export const requestOtpController = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = validateSchema(requestOtpSchema, req.body);
    const result = await authService.requestUserOtp(payload);
    if (result.notificationPayload) {
      void notificationService.sendNotification(
        NotificationEventType.OTP_REQUESTED,
        result.notificationPayload,
      );
    }

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  },
);

export const loginWithOtpController = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = validateSchema(loginWithOtpSchema, req.body);
    const result = await authService.loginUserWithOtp(payload);

    return res.status(200).json({
      success: true,
      token: result.token,
      registrationStep: result.registrationStep,
      verificationStatus: result.verificationStatus,
      onboardingCompleted: result.onboardingCompleted,
    });
  },
);

export const forgotPasswordController = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = validateSchema(forgotPasswordSchema, req.body);
    const result = await authService.forgotUserPassword(payload);
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
  },
);

export const resetPasswordController = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = validateSchema(resetPasswordSchema, req.body);
    const result = await authService.resetUserPassword(payload);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  },
);

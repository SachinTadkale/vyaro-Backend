import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import * as authService from "./auth.service";
import notificationService from "../notification/notification.service";
import { NotificationEventType } from "../notification/notification.types";

export const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);
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
  });
});

export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);

  return res.status(200).json({
    success: true,
    token: result.token,
  });
});

export const requestOtpController = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await authService.requestOtp(req.body);
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
  }
);

export const loginWithOtpController = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await authService.loginWithOtp(req.body);

    return res.status(200).json({
      success: true,
      token: result.token,
    });
  }
);

export const forgotPasswordController = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await authService.forgotPassword(req.body);
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

export const resetPasswordController = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await authService.resetPassword(req.body);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  }
);

/**
 * Module: User Auth Controller
 * Purpose: Handles user registration, login, OTP, password recovery, and session lookup.
 * Used by: user-auth.routes.ts
 */
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
import prisma from "../../../config/prisma";

/**
 * Register User.
 */
export const registerUser = asyncHandler(
  async (req: Request, response: Response) => {
    const payload = validateSchema(registerSchema, req.body);
    const result = await authService.registerUser(payload);
    if (result.notificationPayload) {
      // Notification delivery should not block the auth response.
      void notificationService.sendNotification(
        NotificationEventType.USER_REGISTERED,
        result.notificationPayload,
      );
    }

    return response.status(201).json({
      success: true,
      message: result.message,
      token: result.token,
      registrationStep: result.registrationStep,
      verificationStatus: result.verificationStatus,
      onboardingCompleted: result.onboardingCompleted,
    });
  },
);

/**
 * Login User.
 */
export const loginUser = asyncHandler(async (req: Request, response: Response) => {
  const payload = validateSchema(loginSchema, req.body);
  const result = await authService.loginUser(payload);

  return response.status(200).json({
    success: true,
    token: result.token,
    userRole:result.userRole,
    registrationStep: result.registrationStep,
    verificationStatus: result.verificationStatus,
    onboardingCompleted: result.onboardingCompleted,
  });
});

/**
 * Request Otp Controller.
 */
export const requestOtpController = asyncHandler(
  async (req: Request, response: Response) => {
    const payload = validateSchema(requestOtpSchema, req.body);
    const result = await authService.requestUserOtp(payload);
    if (result.notificationPayload) {
      // OTP notifications are fire-and-forget so the HTTP response remains fast.
      void notificationService.sendNotification(
        NotificationEventType.OTP_REQUESTED,
        result.notificationPayload,
      );
    }

    return response.status(200).json({
      success: true,
      message: result.message,
    });
  },
);

/**
 * Login With Otp Controller.
 */
export const loginWithOtpController = asyncHandler(
  async (req: Request, response: Response) => {
    const payload = validateSchema(loginWithOtpSchema, req.body);
    const result = await authService.loginUserWithOtp(payload);

    return response.status(200).json({
      success: true,
      token: result.token,
      registrationStep: result.registrationStep,
      verificationStatus: result.verificationStatus,
      onboardingCompleted: result.onboardingCompleted,
    });
  },
);

/**
 * Forgot Password Controller.
 */
export const forgotPasswordController = asyncHandler(
  async (req: Request, response: Response) => {
    const payload = validateSchema(forgotPasswordSchema, req.body);
    const result = await authService.forgotUserPassword(payload);
    if (result.notificationPayload) {
      // Password reset notifications should be sent asynchronously.
      void notificationService.sendNotification(
        NotificationEventType.PASSWORD_RESET,
        result.notificationPayload,
      );
    }

    return response.status(200).json({
      success: true,
      message: result.message,
    });
  },
);

/**
 * Reset Password Controller.
 */
export const resetPasswordController = asyncHandler(
  async (req: Request, response: Response) => {
    const payload = validateSchema(resetPasswordSchema, req.body);
    const result = await authService.resetUserPassword(payload);

    return response.status(200).json({
      success: true,
      message: result.message,
    });
  },
);

/**
 * Me Controller.
 */
export const meController = asyncHandler(async (req: Request, response: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    return response.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: {
      user_id: true,
      name: true,
      email: true,
      phone_no: true,
      role: true,
      verificationStatus: true,
      registrationStep: true,
      isBlocked: true,
    },
  });

  if (!user) {
    return response.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  return response.status(200).json({
    success: true,
    user: {
      userId: user.user_id,
      name: user.name,
      email: user.email,
      phone: user.phone_no,
      role: user.role,
      verificationStatus: user.verificationStatus,
      registrationStep: user.registrationStep,
      onboardingCompleted: user.registrationStep >= 4,
      isBlocked: user.isBlocked,
    },
  });
});

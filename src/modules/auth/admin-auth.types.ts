/**
 * Module: Admin Auth.types
 * Purpose: Implements the Admin Auth.types module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import type { NotificationPayload } from "../notification/notification.types";

export type AdminLoginInput = {
  email: string;
  password: string;
};

export type AdminLoginResult = {
  token: string;
};

export type AdminForgotPasswordInput = {
  email: string;
};

export type AdminResetPasswordInput = {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
};

export type AdminMessageResult = {
  message: string;
  notificationPayload?: NotificationPayload;
};

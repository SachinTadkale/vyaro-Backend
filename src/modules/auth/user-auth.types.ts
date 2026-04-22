import { Gender, VerificationStatus } from "@prisma/client";
import type { NotificationPayload } from "../notification/notification.types";

export type RegisterInput = {
  name: string;
  email?: string | null;
  phone_no: string;
  password: string;
  address: string;
  gender?: Gender | null;

  role?: "USER" | "DELIVERY_PARTNER";
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RequestOtpInput = {
  email: string;
};

export type LoginWithOtpInput = {
  email: string;
  otp: string;
};

export type ForgotPasswordInput = {
  email: string;
};

export type ResetPasswordInput = {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
};

export type RegisterResult = {
  message: string;
  token: string;
  registrationStep: number;
  verificationStatus: VerificationStatus;
  onboardingCompleted: boolean;
  notificationPayload?: NotificationPayload;
};

export type LoginResult = {
  token: string;
  registrationStep: number;
  verificationStatus: VerificationStatus;
  onboardingCompleted: boolean;
};

export type RequestOtpResult = {
  message: string;
  notificationPayload?: NotificationPayload;
};

export type LoginWithOtpResult = {
  token: string;
  registrationStep: number;
  verificationStatus: VerificationStatus;
  onboardingCompleted: boolean;
};

export type ForgotPasswordResult = {
  message: string;
  notificationPayload?: NotificationPayload;
};

export type ResetPasswordResult = {
  message: string;
};

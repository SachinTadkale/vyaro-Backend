import bcrypt from "bcrypt";
import { OtpType, UserRole } from "@prisma/client";
import prisma from "../../config/prisma";
import { generateToken } from "../../lib/jwt";
import otpService from "../otp/otp.service";
import ApiError from "../../utils/apiError";
import type {
  AdminForgotPasswordInput,
  AdminLoginInput,
  AdminLoginResult,
  AdminMessageResult,
  AdminResetPasswordInput,
} from "./admin-auth.types";

const findAdminByEmail = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.role !== UserRole.ADMIN) {
    throw new ApiError(
      403,
      "This flow is only for admins. Please use the user auth API."
    );
  }

  return user;
};

export const loginAdmin = async (
  data: AdminLoginInput
): Promise<AdminLoginResult> => {
  if (!data.password) {
    throw new ApiError(400, "Password is required");
  }

  const user = await findAdminByEmail(data.email);

  const isMatch = await bcrypt.compare(data.password, user.password);

  if (!isMatch) {
    throw new ApiError(401, "Invalid credentials");
  }

  if (user.isBlocked) {
    throw new ApiError(403, "Your admin account is blocked.");
  }

  const token = generateToken({
    userId: user.user_id,
    role: user.role,
  });

  return { token };
};

export const forgotPasswordAdmin = async (
  data: AdminForgotPasswordInput
): Promise<AdminMessageResult> => {
  const user = await findAdminByEmail(data.email);

  if (user.isBlocked) {
    throw new ApiError(403, "Your admin account is blocked.");
  }

  if (!user.email) {
    throw new ApiError(400, "Admin email is missing.");
  }

  const otpCode = await otpService.generateOtp(user.user_id, OtpType.RESET_PASSWORD);

  return {
    message: "Admin password reset OTP sent to email.",
    notificationPayload: {
      user: {
        id: user.user_id,
        name: user.name,
        email: user.email,
      },
      metadata: {
        otp: otpCode,
      },
    },
  };
};

export const resetPasswordAdmin = async (
  data: AdminResetPasswordInput
): Promise<AdminMessageResult> => {
  if (!data.newPassword) {
    throw new ApiError(400, "New password is required");
  }

  if (!data.confirmPassword) {
    throw new ApiError(400, "Confirm password is required");
  }

  const user = await findAdminByEmail(data.email);

  if (data.newPassword !== data.confirmPassword) {
    throw new ApiError(400, "Passwords do not match");
  }

  if (user.isBlocked) {
    throw new ApiError(403, "Your admin account is blocked.");
  }

  await otpService.verifyOtp(user.user_id, data.otp, OtpType.RESET_PASSWORD);

  const hashedPassword = await bcrypt.hash(data.newPassword, 10);

  await prisma.user.update({
    where: { user_id: user.user_id },
    data: { password: hashedPassword },
  });

  return { message: "Admin password reset successful." };
};

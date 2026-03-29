import bcrypt from "bcrypt";
import { OtpType, User, UserRole, VerificationStatus } from "@prisma/client";
import prisma from "../../config/prisma";
import ApiError from "../../utils/apiError";
import { sendOtpEmail, sendPasswordResetOtp } from "../../lib/email";
import { generateToken } from "../../lib/jwt";
import otpService from "../otp/otp.service";
import type {
  ForgotPasswordInput,
  ForgotPasswordResult,
  LoginInput,
  LoginResult,
  LoginWithOtpInput,
  LoginWithOtpResult,
  RegisterInput,
  RegisterResult,
  RequestOtpInput,
  RequestOtpResult,
  ResetPasswordInput,
  ResetPasswordResult,
} from "./auth.types";

const requireUserEmail = (user: User): string => {
  if (!user.email) {
    throw new ApiError(400, "Email is required for this action");
  }

  return user.email;
};

const ensureUserCanLogin = (user: User) => {
  if (user.isBlocked) {
    throw new ApiError(403, "Your account is blocked by admin.");
  }

  if (user.verificationStatus === VerificationStatus.PENDING) {
    throw new ApiError(403, "Your documents are under review.");
  }

  if (user.verificationStatus === VerificationStatus.REJECTED) {
    throw new ApiError(403, "Your documents were rejected.");
  }
};

export const register = async (data: RegisterInput): Promise<RegisterResult> => {
  if (!data.password) {
    throw new ApiError(400, "Password is required");
  }

  const existingEmail = data.email
    ? await prisma.user.findUnique({
        where: { email: data.email },
      })
    : null;

  if (existingEmail) {
    throw new ApiError(409, "Email already registered");
  }

  const existingPhone = await prisma.user.findUnique({
    where: { phone_no: data.phone_no },
  });

  if (existingPhone) {
    throw new ApiError(409, "Phone number already registered");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      phone_no: data.phone_no,
      password: hashedPassword,
      address: data.address,
      email: data.email,
      gender: data.gender,
      verificationStatus: VerificationStatus.PENDING,
      role: UserRole.USER,
      registrationStep: 1,
    },
  });

  const token = generateToken({
    userId: user.user_id,
    role: user.role,
    actorType: "USER",
  });

  return {
    message: "Registration successful. Continue onboarding.",
    token,
  };
};

export const login = async (data: LoginInput): Promise<LoginResult> => {
  if (!data.password) {
    throw new ApiError(400, "Password is required");
  }

  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  const isMatch = await bcrypt.compare(data.password, user.password);

  if (!isMatch) {
    throw new ApiError(401, "Invalid credentials");
  }

  if (user.role === UserRole.ADMIN) {
    throw new ApiError(403, "Admin accounts must login through the admin login API.");
  }

  ensureUserCanLogin(user);

  const token = generateToken({
    userId: user.user_id,
    role: user.role,
    actorType: "USER",
  });

  return { token };
};

export const requestOtp = async (
  data: RequestOtpInput
): Promise<RequestOtpResult> => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.role === UserRole.ADMIN) {
    throw new ApiError(403, "Admin cannot login using OTP");
  }

  ensureUserCanLogin(user);

  const email = requireUserEmail(user);
  const otpCode = await otpService.generateOtp(user.user_id, OtpType.LOGIN);

  await sendOtpEmail(email, user.name, otpCode);

  return { message: "OTP sent to your email." };
};

export const loginWithOtp = async (
  data: LoginWithOtpInput
): Promise<LoginWithOtpResult> => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new ApiError(400, "Invalid request");
  }

  if (user.role === UserRole.ADMIN) {
    throw new ApiError(403, "Admin cannot login using OTP");
  }

  ensureUserCanLogin(user);

  await otpService.verifyOtp(user.user_id, data.otp, OtpType.LOGIN);

  const token = generateToken({
    userId: user.user_id,
    role: user.role,
    actorType: "USER",
  });

  return { token };
};

export const forgotPassword = async (
  data: ForgotPasswordInput
): Promise<ForgotPasswordResult> => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.isBlocked) {
    throw new ApiError(403, "Your account is blocked by admin.");
  }

  const email = requireUserEmail(user);
  const otpCode = await otpService.generateOtp(
    user.user_id,
    OtpType.RESET_PASSWORD
  );

  await sendPasswordResetOtp(email, user.name, otpCode);

  return { message: "Password reset OTP sent to email." };
};

export const resetPassword = async (
  data: ResetPasswordInput
): Promise<ResetPasswordResult> => {
  if (!data.newPassword) {
    throw new ApiError(400, "New password is required");
  }

  if (!data.confirmPassword) {
    throw new ApiError(400, "Confirm password is required");
  }

  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (data.newPassword !== data.confirmPassword) {
    throw new ApiError(400, "Passwords do not match");
  }

  await otpService.verifyOtp(user.user_id, data.otp, OtpType.RESET_PASSWORD);

  const hashedPassword = await bcrypt.hash(data.newPassword, 10);

  await prisma.user.update({
    where: { user_id: user.user_id },
    data: { password: hashedPassword },
  });

  return { message: "Password reset successful" };
};

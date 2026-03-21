import bcrypt from "bcrypt";
import { OtpType, UserRole, VerificationStatus } from "@prisma/client";
import prisma from "../../config/prisma";
import { sendOtpEmail, sendPasswordResetOtp } from "../../lib/email";
import { generateToken } from "../../lib/jwt";
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

const OTP_EXPIRY_MS = 90 * 1000;

const ensureUserCanAuthenticate = (user: {
  isBlocked: boolean;
  role: UserRole;
  verificationStatus: VerificationStatus;
}) => {
  if (user.isBlocked) {
    throw new Error("Your account is blocked by admin.");
  }

  if (user.role === UserRole.ADMIN) {
    return;
  }

  if (user.verificationStatus === VerificationStatus.PENDING) {
    throw new Error("Your documents are under review.");
  }

  if (user.verificationStatus === VerificationStatus.REJECTED) {
    throw new Error("Your documents were rejected.");
  }
};

const generateOtpCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const register = async (data: RegisterInput): Promise<RegisterResult> => {
  if (!data.password) {
    throw new Error("Password is required");
  }

  const existingEmail = data.email
    ? await prisma.user.findUnique({
        where: { email: data.email },
      })
    : null;

  if (existingEmail) {
    throw new Error("Email already registered");
  }

  const existingPhone = await prisma.user.findUnique({
    where: { phone_no: data.phone_no },
  });

  if (existingPhone) {
    throw new Error("Phone number already registered");
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
    },
  });

  const token = generateToken({
    userId: user.user_id,
    role: user.role,
  });

  return {
    message: "Registration successful. Continue onboarding.",
    token,
  };
};

export const login = async (data: LoginInput): Promise<LoginResult> => {
  if (!data.password) {
    throw new Error("Password is required");
  }

  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isMatch = await bcrypt.compare(data.password, user.password);

  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  if (user.role === UserRole.ADMIN) {
    throw new Error(
      "Admin accounts must login through the admin login API."
    );
  }

  ensureUserCanAuthenticate(user);

  const token = generateToken({
    userId: user.user_id,
    role: user.role,
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
    throw new Error("User not found");
  }

  if (user.role === UserRole.ADMIN) {
    throw new Error("Admin cannot login using OTP");
  }

  ensureUserCanAuthenticate(user);

  const otpCode = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  await prisma.otp.updateMany({
    where: {
      userId: user.user_id,
      type: OtpType.LOGIN,
      isUsed: false,
    },
    data: { isUsed: true },
  });

  await prisma.otp.create({
    data: {
      userId: user.user_id,
      code: otpCode,
      type: OtpType.LOGIN,
      expiresAt,
    },
  });

  await sendOtpEmail(user.email ?? "", user.name, otpCode);

  return { message: "OTP sent to your email." };
};

export const loginWithOtp = async (
  data: LoginWithOtpInput
): Promise<LoginWithOtpResult> => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new Error("Invalid request");
  }

  if (user.role === UserRole.ADMIN) {
    throw new Error("Admin cannot login using OTP");
  }

  ensureUserCanAuthenticate(user);

  const otpRecord = await prisma.otp.findFirst({
    where: {
      userId: user.user_id,
      code: data.otp,
      type: OtpType.LOGIN,
      isUsed: false,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otpRecord) {
    throw new Error("Invalid OTP");
  }

  if (otpRecord.expiresAt < new Date()) {
    throw new Error("OTP expired");
  }

  await prisma.otp.update({
    where: { otpId: otpRecord.otpId },
    data: { isUsed: true },
  });

  const token = generateToken({
    userId: user.user_id,
    role: user.role,
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
    throw new Error("User not found");
  }

  if (user.isBlocked) {
    throw new Error("Your account is blocked by admin.");
  }

  const otpCode = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  await prisma.otp.updateMany({
    where: {
      userId: user.user_id,
      type: OtpType.RESET_PASSWORD,
      isUsed: false,
    },
    data: { isUsed: true },
  });

  await prisma.otp.create({
    data: {
      userId: user.user_id,
      code: otpCode,
      type: OtpType.RESET_PASSWORD,
      expiresAt,
    },
  });

  await sendPasswordResetOtp(user.email ?? "", user.name, otpCode);

  return { message: "Password reset OTP sent to email." };
};

export const resetPassword = async (
  data: ResetPasswordInput
): Promise<ResetPasswordResult> => {
  if (!data.newPassword) {
    throw new Error("New password is required");
  }

  if (!data.confirmPassword) {
    throw new Error("Confirm password is required");
  }

  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (data.newPassword !== data.confirmPassword) {
    throw new Error("Passwords do not match");
  }

  const otpRecord = await prisma.otp.findFirst({
    where: {
      userId: user.user_id,
      code: data.otp,
      type: OtpType.RESET_PASSWORD,
      isUsed: false,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otpRecord) {
    throw new Error("Invalid OTP");
  }

  if (otpRecord.expiresAt < new Date()) {
    throw new Error("OTP expired");
  }

  const hashedPassword = await bcrypt.hash(data.newPassword, 10);

  await prisma.user.update({
    where: { user_id: user.user_id },
    data: { password: hashedPassword },
  });

  await prisma.otp.update({
    where: { otpId: otpRecord.otpId },
    data: { isUsed: true },
  });

  return { message: "Password reset successful" };
};

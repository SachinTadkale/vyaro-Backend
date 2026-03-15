import bcrypt from "bcrypt";
import { OtpType, User, UserRole, VerificationStatus } from "@prisma/client";
import prisma from "../../config/prisma";
import { generateToken } from "../../lib/jwt";
import { sendOtpEmail, sendPasswordResetOtp } from "../../lib/email";
import otpService from "../otp/otp.service";

const requireUserEmail = (user: User): string => {
  if (!user.email) {
    throw new Error("Email is required for this action");
  }

  return user.email;
};

const ensureUserCanLogin = (user: User) => {
  if (user.isBlocked) {
    throw new Error("Your account is blocked by admin.");
  }

  if (user.verificationStatus === VerificationStatus.PENDING) {
    throw new Error("Your documents are under review.");
  }

  if (user.verificationStatus === VerificationStatus.REJECTED) {
    throw new Error("Your documents were rejected.");
  }
};

export const register = async (data: any) => {
  const existingEmail = await prisma.user.findUnique({
    where: { email: data.email },
  });

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

export const login = async (data: any) => {
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
    const token = generateToken({
      userId: user.user_id,
      role: user.role,
      actorType: "USER",
    });

    return { token };
  }

  ensureUserCanLogin(user);

  const token = generateToken({
    userId: user.user_id,
    role: user.role,
    actorType: "USER",
  });

  return { token };
};

export const requestOtp = async (data: any) => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.role === UserRole.ADMIN) {
    throw new Error("Admin cannot login using OTP");
  }

  ensureUserCanLogin(user);

  const email = requireUserEmail(user);
  const otpCode = await otpService.generateOtp(user.user_id, OtpType.LOGIN);

  await sendOtpEmail(email, user.name, otpCode);

  return { message: "OTP sent to your email." };
};

export const loginWithOtp = async (data: any) => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new Error("Invalid request");
  }

  if (user.role === UserRole.ADMIN) {
    throw new Error("Admin cannot login using OTP");
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

export const forgotPassword = async (data: any) => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.isBlocked) {
    throw new Error("Your account is blocked by admin.");
  }

  const email = requireUserEmail(user);
  const otpCode = await otpService.generateOtp(
    user.user_id,
    OtpType.RESET_PASSWORD,
  );

  await sendPasswordResetOtp(email, user.name, otpCode);

  return { message: "Password reset OTP sent to email." };
};

export const resetPassword = async (data: any) => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (data.newPassword !== data.confirmPassword) {
    throw new Error("Passwords do not match");
  }

  await otpService.verifyOtp(user.user_id, data.otp, OtpType.RESET_PASSWORD);

  const hashedPassword = await bcrypt.hash(data.newPassword, 10);

  await prisma.user.update({
    where: { user_id: user.user_id },
    data: { password: hashedPassword },
  });

  return { message: "Password reset successful" };
};

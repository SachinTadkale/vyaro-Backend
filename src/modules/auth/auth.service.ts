import bcrypt from "bcrypt";
import prisma from "../../config/prisma";
import { generateToken } from "../../lib/jwt";
import { sendOtpEmail } from "../../lib/email";
import otpService from "../otp/otp.service";

//////////////////////////////////////
// REGISTER
//////////////////////////////////////

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
      role: "USER",
      verificationStatus: "PENDING",
      registrationStep: 1,
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

//////////////////////////////////////
// PASSWORD LOGIN
//////////////////////////////////////

export const login = async (data: any) => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) throw new Error("Invalid credentials");

  if (user.isBlocked) {
    throw new Error("Your account is blocked by admin.");
  }

  const isMatch = await bcrypt.compare(
    data.password,
    user.password
  );

  if (!isMatch) throw new Error("Invalid credentials");

  if (user.role !== "ADMIN") {
    if (user.verificationStatus === "PENDING") {
      throw new Error("Your documents are under verification.");
    }

    if (user.verificationStatus === "REJECTED") {
      throw new Error(
        "Your verification was rejected. Contact support."
      );
    }

    if (user.verificationStatus !== "APPROVED") {
      throw new Error("Unable to login.");
    }
  }

  const token = generateToken({
    userId: user.user_id,
    role: user.role,
  });

  return { token };
};

//////////////////////////////////////
// REQUEST OTP
//////////////////////////////////////

export const requestOtp = async (data: any) => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) throw new Error("User not found");

  if (user.isBlocked) {
    throw new Error("Your account is blocked by admin.");
  }

  if (user.role === "ADMIN") {
    throw new Error("Admin cannot login using OTP");
  }

  if (user.verificationStatus !== "APPROVED") {
    throw new Error("Account not approved.");
  }

  const otpCode = Math.floor(
    100000 + Math.random() * 900000
  ).toString();

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await prisma.otp.updateMany({
    where: {
      userId: user.user_id,
      type: "LOGIN",
      isUsed: false,
    },
    data: { isUsed: true },
  });

  await prisma.otp.create({
    data: {
      userId: user.user_id,
      code: otpCode,
      type: "LOGIN",
      expiresAt,
    },
  });

  await sendOtpEmail(user.email, user.name, otpCode);

  return { message: "OTP sent to your email." };
};

//////////////////////////////////////
// LOGIN WITH OTP
//////////////////////////////////////

export const loginWithOtp = async (data: any) => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) throw new Error("Invalid request");

  if (user.isBlocked) {
    throw new Error("Your account is blocked by admin.");
  }

  if (user.role === "ADMIN") {
    throw new Error("Admin cannot login using OTP");
  }

  if (user.verificationStatus === "PENDING") {
    throw new Error("Your documents are under verification.");
  }

  if (user.verificationStatus === "REJECTED") {
    throw new Error("Your verification was rejected.");
  }

  if (user.verificationStatus !== "APPROVED") {
    throw new Error("Unable to login.");
  }

  const otpRecord = await prisma.otp.findFirst({
    where: {
      userId: user.user_id,
      code: data.otp,
      type: "LOGIN",
      isUsed: false,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otpRecord) throw new Error("Invalid OTP");

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
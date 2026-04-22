import bcrypt from "bcrypt";
import { OtpType, User, UserRole, VerificationStatus } from "@prisma/client";
import prisma from "../../config/prisma";
import ApiError from "../../utils/apiError";
import { generateToken } from "../../lib/jwt";
import otpService from "../otp/otp.service";
import * as companyRepo from "./company-auth.repository";

// Types
import type {
  ForgotPasswordInput as UserForgotPasswordInput,
  ForgotPasswordResult as UserForgotPasswordResult,
  LoginInput as UserLoginInput,
  LoginResult as UserLoginResult,
  LoginWithOtpInput as UserLoginWithOtpInput,
  LoginWithOtpResult as UserLoginWithOtpResult,
  RegisterInput as UserRegisterInput,
  RegisterResult as UserRegisterResult,
  RequestOtpInput as UserRequestOtpInput,
  RequestOtpResult as UserRequestOtpResult,
  ResetPasswordInput as UserResetPasswordInput,
  ResetPasswordResult as UserResetPasswordResult,
} from "./user-auth.types";

import type { RegisterCompanyInput } from "./company-auth.types";

import type {
  AdminForgotPasswordInput,
  AdminLoginInput,
  AdminLoginResult,
  AdminMessageResult,
  AdminResetPasswordInput,
} from "./admin-auth.types";

/* -------------------------------------------------------------------------- */
/*                                USER AUTH                                   */
/* -------------------------------------------------------------------------- */

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
  // if (user.verificationStatus === VerificationStatus.PENDING) {
  //   throw new ApiError(403, "Your documents are under review.");
  // }
  if (user.verificationStatus === VerificationStatus.REJECTED) {
    throw new ApiError(403, "Your documents were rejected.");
  }
};

export const registerUser = async (
  data: UserRegisterInput,
): Promise<UserRegisterResult> => {
  if (!data.password) {
    throw new ApiError(400, "Password is required");
  }

  const existingEmail = data.email
    ? await prisma.user.findUnique({ where: { email: data.email } })
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

  const role =
    data.role === "DELIVERY_PARTNER"
      ? UserRole.DELIVERY_PARTNER
      : UserRole.USER;

  const user = await prisma.user.create({
    data: {
      name: data.name,
      phone_no: data.phone_no,
      password: hashedPassword,
      address: data.address,
      email: data.email,
      gender: data.gender,
      verificationStatus: VerificationStatus.PENDING,
      role: role,
      registrationStep: 1,
    },
  });

  const token = generateToken({
    userId: user.user_id,
    role: user.role,
    actorType: role === UserRole.DELIVERY_PARTNER ? "DELIVERY_PARTNER" : "USER",
  });

  return {
    message: "Registration successful. Continue onboarding.",
    token,
    registrationStep: user.registrationStep,
    verificationStatus: user.verificationStatus,
    onboardingCompleted: false,
    notificationPayload: user.email
      ? {
          user: {
            id: user.user_id,
            name: user.name,
            email: user.email,
          },
        }
      : undefined,
  };
};

export const loginUser = async (
  data: UserLoginInput,
): Promise<UserLoginResult> => {
  if (!data.password) {
    throw new ApiError(400, "Password is required");
  }

  const user = await prisma.user.findUnique({ where: { email: data.email } });

  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  const isMatch = await bcrypt.compare(data.password, user.password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid credentials");
  }

  if (user.role === UserRole.ADMIN) {
    throw new ApiError(
      403,
      "Admin accounts must login through the Admin web portal.",
    );
  }

  if (user.role === UserRole.COMPANY) {
    throw new ApiError(403, "Use Web Portal to Login As Buyer");
  }

  ensureUserCanLogin(user);
  if (user.role === UserRole.DELIVERY_PARTNER) {
    const profile = await prisma.deliveryPartner.findUnique({
      where: { userId: user.user_id },
    });
    if (!profile) {
      throw new ApiError(403, " Please complete your delivery partner profile");
    }
  }

  const token = generateToken({
    userId: user.user_id,
    role: user.role,
    actorType: "USER",
  });

  return {
    token,
    registrationStep: user.registrationStep,
    verificationStatus: user.verificationStatus,
    onboardingCompleted: user.registrationStep === 4,
  };
};

export const requestUserOtp = async (
  data: UserRequestOtpInput,
): Promise<UserRequestOtpResult> => {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  if (user.role === UserRole.ADMIN) {
    throw new ApiError(403, "Admin cannot login using OTP");
  }
  if (user.role === UserRole.COMPANY) {
    throw new ApiError(403, "Company cannot login using OTP");
  }
  ensureUserCanLogin(user);

  const email = requireUserEmail(user);
  const otpCode = await otpService.generateOtp(user.user_id, OtpType.LOGIN);

  return {
    message: "OTP sent to your email.",
    notificationPayload: {
      user: { id: user.user_id, name: user.name, email },
      metadata: { otp: otpCode },
    },
  };
};

export const loginUserWithOtp = async (
  data: UserLoginWithOtpInput,
): Promise<UserLoginWithOtpResult> => {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) {
    throw new ApiError(400, "Invalid request");
  }
  if (user.role === UserRole.ADMIN) {
    throw new ApiError(403, "Admin cannot login using OTP");
  }
  if (user.role === UserRole.COMPANY) {
    throw new ApiError(403, "Company cannot login using OTP");
  }
  ensureUserCanLogin(user);

  await otpService.verifyOtp(user.user_id, data.otp, OtpType.LOGIN);

  if (user.role === UserRole.DELIVERY_PARTNER) {
    const profile = await prisma.deliveryPartner.findUnique({
      where: { userId: user.user_id },
    });
    if (!profile) {
      throw new ApiError(403, " Please complete your delivery partner profile");
    }
  }

  const token = generateToken({
    userId: user.user_id,
    role: user.role,
    actorType:
      user.role === UserRole.DELIVERY_PARTNER ? "DELIVERY_PARTNER" : "USER",
  });

  return {
    token,
    registrationStep: user.registrationStep,
    verificationStatus: user.verificationStatus,
    onboardingCompleted: user.registrationStep === 4,
  };
};

export const forgotUserPassword = async (
  data: UserForgotPasswordInput,
): Promise<UserForgotPasswordResult> => {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  if (user.isBlocked) {
    throw new ApiError(403, "Your account is blocked by admin.");
  }

  const email = requireUserEmail(user);
  const otpCode = await otpService.generateOtp(
    user.user_id,
    OtpType.RESET_PASSWORD,
  );

  return {
    message: "Password reset OTP sent to email.",
    notificationPayload: {
      user: { id: user.user_id, name: user.name, email },
      metadata: { otp: otpCode },
    },
  };
};

export const resetUserPassword = async (
  data: UserResetPasswordInput,
): Promise<UserResetPasswordResult> => {
  if (!data.newPassword) throw new ApiError(400, "New password is required");
  if (!data.confirmPassword)
    throw new ApiError(400, "Confirm password is required");

  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) throw new ApiError(404, "User not found");
  if (data.newPassword !== data.confirmPassword)
    throw new ApiError(400, "Passwords do not match");

  await otpService.verifyOtp(user.user_id, data.otp, OtpType.RESET_PASSWORD);

  const hashedPassword = await bcrypt.hash(data.newPassword, 10);
  await prisma.user.update({
    where: { user_id: user.user_id },
    data: { password: hashedPassword },
  });

  return { message: "Password reset successful" };
};

/* -------------------------------------------------------------------------- */
/*                              COMPANY AUTH                                  */
/* -------------------------------------------------------------------------- */

const sanitizeCompany = <T extends { password: string }>(company: T) => {
  const { password: _password, ...safeCompany } = company;
  return safeCompany;
};

export const registerCompany = async (data: RegisterCompanyInput) => {
  const existing = await companyRepo.findCompanyByRegistration(
    data.registrationNo,
  );
  if (existing) throw new ApiError(409, "Company already exists");

  const hashedPassword = await bcrypt.hash(data.password, 10);
  return companyRepo.createCompany({ ...data, password: hashedPassword });
};

export const uploadCompanyDocs = async (
  companyId: string,
  gstUrl: string,
  licenseUrl: string,
) => {
  return companyRepo.updateCompanyDocs(companyId, gstUrl, licenseUrl);
};

export const verifyCompany = async (companyId: string) => {
  return companyRepo.verifyCompany(companyId);
};

export const loginCompany = async (
  registrationNo: string,
  password: string,
) => {
  const company = await companyRepo.findCompanyByRegistration(registrationNo);
  if (!company) throw new ApiError(404, "Company not found");
  if (company.verification !== "VERIFIED")
    throw new ApiError(403, "Company not verified");

  const isPasswordValid = await bcrypt.compare(password, company.password);
  if (!isPasswordValid) throw new ApiError(401, "Invalid credentials");

  const token = generateToken({
    userId: company.companyId,
    companyId: company.companyId,
    actorType: "COMPANY",
  });

  return { token, company: sanitizeCompany(company) };
};

export const logoutCompany = async () => {
  return { message: "Logged out successfully" };
};

/* -------------------------------------------------------------------------- */
/*                                ADMIN AUTH                                   */
/* -------------------------------------------------------------------------- */

const findAdminByEmail = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new ApiError(404, "User not found");
  if (user.role !== UserRole.ADMIN)
    throw new ApiError(403, "This flow is only for admins.");
  return user;
};

export const loginAdmin = async (
  data: AdminLoginInput,
): Promise<AdminLoginResult> => {
  if (!data.password) throw new ApiError(400, "Password is required");
  const user = await findAdminByEmail(data.email);

  const isMatch = await bcrypt.compare(data.password, user.password);
  if (!isMatch) throw new ApiError(401, "Invalid credentials");
  if (user.isBlocked) throw new ApiError(403, "Your admin account is blocked.");

  const token = generateToken({ userId: user.user_id, role: user.role });
  return { token };
};

export const forgotAdminPassword = async (
  data: AdminForgotPasswordInput,
): Promise<AdminMessageResult> => {
  const user = await findAdminByEmail(data.email);
  if (user.isBlocked) throw new ApiError(403, "Your admin account is blocked.");
  if (!user.email) throw new ApiError(400, "Admin email is missing.");

  const otpCode = await otpService.generateOtp(
    user.user_id,
    OtpType.RESET_PASSWORD,
  );

  return {
    message: "Admin password reset OTP sent to email.",
    notificationPayload: {
      user: { id: user.user_id, name: user.name, email: user.email },
      metadata: { otp: otpCode },
    },
  };
};

export const resetAdminPassword = async (
  data: AdminResetPasswordInput,
): Promise<AdminMessageResult> => {
  if (!data.newPassword) throw new ApiError(400, "New password is required");
  if (!data.confirmPassword)
    throw new ApiError(400, "Confirm password is required");

  const user = await findAdminByEmail(data.email);
  if (data.newPassword !== data.confirmPassword)
    throw new ApiError(400, "Passwords do not match");
  if (user.isBlocked) throw new ApiError(403, "Your admin account is blocked.");

  await otpService.verifyOtp(user.user_id, data.otp, OtpType.RESET_PASSWORD);

  const hashedPassword = await bcrypt.hash(data.newPassword, 10);
  await prisma.user.update({
    where: { user_id: user.user_id },
    data: { password: hashedPassword },
  });

  return { message: "Admin password reset successful." };
};

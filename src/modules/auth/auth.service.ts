/**
 * Module: Auth.service
 * Purpose: Implements the Auth.service module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import bcrypt from "bcrypt";
import { OtpType, User, UserRole, VerificationStatus } from "@prisma/client";
import prisma from "../../config/prisma";
import ApiError from "../../utils/apiError";
import { generateToken } from "../../lib/jwt";
import otpService from "../otp/otp.service";
import companyOtpService from "../otp/company-otp.service";
import * as companyRepo from "./company-auth.repository";
import { sendCompanyPasswordResetOtp } from "../../lib/resend-email";

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

import type {
  RegisterCompanyInput,
  CompanyForgotPasswordInput,
  CompanyVerifyResetOtpInput,
  CompanyResetPasswordInput,
  CompanyMessageResult,
} from "./company-auth.types";


import type {
  AdminForgotPasswordInput,
  AdminLoginInput,
  AdminLoginResult,
  AdminMessageResult,
  AdminResetPasswordInput,
} from "./admin-auth.types";

/* -------------------------------------------------------------------------- */
/*                           SECURITY UTILITIES                               */
/* -------------------------------------------------------------------------- */

/**
 * Enforce a minimum elapsed time for an async operation.
 *
 * Used to normalize response timing in flows that could otherwise leak
 * information about whether a resource (e.g. an email) exists.
 *
 * A random jitter within [minMs, maxMs] is added to prevent deterministic
 * timing patterns that could defeat naive timing attacks.
 *
 * @param startTime  Value from Date.now() captured before the operation began
 * @param minMs      Minimum total elapsed time to enforce (default: 400ms)
 * @param maxMs      Maximum total elapsed time to enforce (default: 700ms)
 */
const enforceMinResponseTime = async (
  startTime: number,
  minMs = 400,
  maxMs = 700,
): Promise<void> => {
  const jitter = Math.floor(Math.random() * (maxMs - minMs));
  const target = minMs + jitter;
  const elapsed = Date.now() - startTime;
  const remaining = target - elapsed;
  if (remaining > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, remaining));
  }
};

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

/**
 * Register User.
 */
export const registerUser = async (
  data: UserRegisterInput,
): Promise<UserRegisterResult> => {
  // ✅ Mandatory fields check
  if (!data.name) throw new ApiError(400, "Name is required");
  if (!data.phone_no) throw new ApiError(400, "Phone number is required");
  if (!data.password) throw new ApiError(400, "Password is required");
  if (!data.address) throw new ApiError(400, "Address is required");
  if (!data.role) throw new ApiError(400, "Role is required");

  // ✅ Strict role validation
  let role: UserRole;
  if (data.role === "DELIVERY_PARTNER") {
    role = UserRole.DELIVERY_PARTNER;
  } else if (data.role === "FARMER") {
    role = UserRole.FARMER;
  } else {
    throw new ApiError(400, "Invalid role");
  }

  // ✅ Better duplicate check (single query)
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: data.email }, { phone_no: data.phone_no }],
    },
  });

  if (existing) {
    throw new ApiError(409, "User already exists");
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
      role,
      registrationStep: 1,
    },
  });

  const token = generateToken({
    userId: user.user_id,
    role: user.role,
    actorType: role === UserRole.DELIVERY_PARTNER ? "DELIVERY_PARTNER" : "FARMER",
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

/**
 * Login User.
 */
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

    // ✅ Allow login during onboarding
    if (user.registrationStep === 4 && !profile) {
      throw new ApiError(403, "Please complete your delivery partner profile");
    }

    if (
      user.registrationStep === 4 &&
      user.verificationStatus !== VerificationStatus.VERIFIED
    ) {
      throw new ApiError(403, "Account not verified by admin");
    }
  }

  const token = generateToken({
    userId: user.user_id,
    role: user.role,
    actorType:
      user.role === UserRole.DELIVERY_PARTNER ? "DELIVERY_PARTNER" : "FARMER",
  });

  return {
    token,
    userRole:user.role,
    registrationStep: user.registrationStep,
    verificationStatus: user.verificationStatus,
    onboardingCompleted: user.registrationStep === 4,
  };
};

/**
 * Request User Otp.
 */
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

/**
 * Login User With Otp.
 */
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

    if (user.registrationStep === 4 && !profile) {
      throw new ApiError(403, "Please complete your delivery partner profile");
    }
  }

  const token = generateToken({
    userId: user.user_id,
    role: user.role,
    actorType:
      user.role === UserRole.DELIVERY_PARTNER ? "DELIVERY_PARTNER" : "FARMER",
  });

  return {
    token,
    registrationStep: user.registrationStep,
    verificationStatus: user.verificationStatus,
    onboardingCompleted: user.registrationStep === 4,
  };
};

/**
 * Forgot User Password.
 */
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

/**
 * Reset User Password.
 */
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

/**
 * Register Company.
 */
export const registerCompany = async (data: RegisterCompanyInput) => {
  const existing = await companyRepo.findCompanyByRegistration(
    data.registrationNo,
  );
  if (existing) throw new ApiError(409, "Company already exists");

  const hashedPassword = await bcrypt.hash(data.password, 10);
  const company = await companyRepo.createCompany({ ...data, password: hashedPassword });
  return {
    company,
    notificationPayload: company.email
      ? {
          company: {
            id: company.companyId,
            name: company.companyName,
            email: company.email,
          },
        }
      : undefined,
  };
};

/**
 * Upload Company Docs.
 */
export const uploadCompanyDocs = async (
  companyId: string,
  gstUrl: string,
  licenseUrl: string,
) => {
  return companyRepo.updateCompanyDocs(companyId, gstUrl, licenseUrl);
};

/**
 * Verify Company.
 */
export const verifyCompany = async (companyId: string) => {
  return companyRepo.verifyCompany(companyId);
};

/**
 * Login Company.
 */
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

/**
 * Logout Company.
 */
export const logoutCompany = async () => {
  return { message: "Logged out successfully" };
};

/* -------------------------------------------------------------------------- */
/*                        COMPANY PASSWORD RESET                               */
/* -------------------------------------------------------------------------- */

/**
 * Forgot Company Password — Step 1.
 *
 * Accepts an email, silently looks up the company, generates an OTP, and
 * dispatches a password reset email via Resend.
 *
 * Security: ALWAYS returns a generic success message regardless of whether
 * the email exists, to prevent account enumeration.
 */
export const forgotCompanyPassword = async (
  data: CompanyForgotPasswordInput,
): Promise<CompanyMessageResult> => {
  // Capture start time BEFORE any async work so we can enforce a minimum
  // response duration regardless of whether the email exists.
  // This neutralises timing-based account enumeration.
  const startTime = Date.now();

  const GENERIC_RESPONSE = {
    message: "If an account with this email exists, a reset code has been sent.",
  };

  const company = await prisma.company.findUnique({ where: { email: data.email } });

  if (!company) {
    // Silent exit — do not leak whether the email is registered.
    // Still enforce minimum response time before returning.
    await enforceMinResponseTime(startTime);
    return GENERIC_RESPONSE;
  }

  // Generate OTP (handles cooldown enforcement and invalidates old OTPs)
  const otpCode = await companyOtpService.generateOtp(
    company.companyId,
    OtpType.RESET_PASSWORD,
  );

  // Send email — failures are logged but not surfaced to the caller
  try {
    await sendCompanyPasswordResetOtp(company.email, company.companyName, otpCode);
  } catch (err: any) {
    console.error("\n========================================");
    console.error("🚨 RESEND ERROR DETECTED 🚨");
    console.error("========================================");
    console.error("Message:", err?.message);
    console.error("Status Code:", err?.statusCode || err?.status || "N/A");
    console.error("Stack Trace:\n", err?.stack);
    console.error("Full Raw Error Object:");
    console.dir(err, { depth: null });
    console.error("========================================\n");
  }

  // Enforce minimum response time for the "email found" path too,
  // so both branches take approximately the same wall-clock time.
  await enforceMinResponseTime(startTime);

  return GENERIC_RESPONSE;
};

/**
 * Verify Company Reset OTP — Step 2.
 *
 * Validates the submitted 6-digit OTP against the stored (hashed) record.
 * Marks it as "verified" so the reset-password step can confirm it.
 *
 * Security: Generic messages on failure — no leakage of OTP state.
 */
export const verifyCompanyResetOtp = async (
  data: CompanyVerifyResetOtpInput,
): Promise<CompanyMessageResult> => {
  const company = await prisma.company.findUnique({ where: { email: data.email } });

  if (!company) {
    // Uniform failure message — do not reveal whether email exists
    throw new ApiError(400, "Invalid or expired OTP.");
  }

  await companyOtpService.verifyOtp(
    company.companyId,
    data.otp,
    OtpType.RESET_PASSWORD,
  );

  return { message: "OTP verified. You may now reset your password." };
};

/**
 * Reset Company Password — Step 3.
 *
 * Requires a verified OTP to exist (from step 2).
 * Hashes the new password and updates the Company record.
 * Consumes (invalidates) the OTP after success so it cannot be reused.
 */
export const resetCompanyPassword = async (
  data: CompanyResetPasswordInput,
): Promise<CompanyMessageResult> => {
  const company = await prisma.company.findUnique({ where: { email: data.email } });

  if (!company) {
    throw new ApiError(400, "Invalid request. Please restart the password reset flow.");
  }

  // All critical operations run inside a transaction to prevent a race condition
  // where two concurrent reset requests both find the same verified OTP, both
  // update the password to different values, and one OTP is never consumed.
  await prisma.$transaction(async (tx) => {
    // Confirm a verified, non-consumed OTP exists — throws if not
    const verifiedOtp = await tx.companyOtp.findFirst({
      where: {
        companyId: company.companyId,
        type: OtpType.RESET_PASSWORD,
        isVerified: true,
        isUsed: false,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!verifiedOtp) {
      throw new ApiError(400, "No verified OTP found. Please complete the OTP verification step first.");
    }

    if (verifiedOtp.expiresAt.getTime() < Date.now()) {
      throw new ApiError(400, "Verified OTP has expired. Please restart the password reset flow.");
    }

    // Consume the verified OTP immediately — this is the critical guard
    // against concurrent reset attempts with the same OTP.
    await tx.companyOtp.update({
      where: { id: verifiedOtp.id },
      data: { isUsed: true },
    });

    // Hash and persist the new password
    const hashedPassword = await bcrypt.hash(data.newPassword, 10);
    await tx.company.update({
      where: { companyId: company.companyId },
      data: { password: hashedPassword },
    });

    // Belt-and-suspenders: invalidate ALL remaining OTPs for this company
    await tx.companyOtp.updateMany({
      where: { companyId: company.companyId, type: OtpType.RESET_PASSWORD, isUsed: false },
      data: { isUsed: true },
    });
  });

  return { message: "Password reset successful. You can now log in with your new password." };
};



const findAdminByEmail = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new ApiError(404, "User not found");
  if (user.role !== UserRole.ADMIN)
    throw new ApiError(403, "This flow is only for admins.");
  return user;
};

/**
 * Login Admin.
 */
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

/**
 * Forgot Admin Password.
 */
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

/**
 * Reset Admin Password.
 */
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

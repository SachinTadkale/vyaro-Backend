/**
 * Module: Company Auth.types
 * Purpose: Type definitions for Company Auth module, including password reset flow.
 */
export interface RegisterCompanyInput {
  companyName: string;
  registrationNo: string;
  hqLocation: string;
  gstNumber: string;
  email: string;
  password: string;
}

export interface CompanyPasswordLoginInput {
  registrationNo: string;
  password: string;
}

// ─── Password Reset Flow Types ────────────────────────────────────────────────

export interface CompanyForgotPasswordInput {
  email: string;
}

export interface CompanyVerifyResetOtpInput {
  email: string;
  otp: string;
}

export interface CompanyResetPasswordInput {
  email: string;
  otp: string;
  newPassword: string;
}

export interface CompanyMessageResult {
  message: string;
}

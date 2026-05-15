/**
 * Module: Company OTP Service
 * Purpose: Secure OTP lifecycle management for Company password reset flow.
 * Separate from the User OTP service — Company auth is architecturally distinct.
 */
import crypto from "crypto";
import bcrypt from "bcrypt";
import { OtpType } from "@prisma/client";
import prisma from "../../config/prisma";
import ApiError from "../../utils/apiError";

/** OTP is valid for 5 minutes */
const OTP_EXPIRY_MS = 5 * 60 * 1000;

/** Resend cooldown: prevent spamming within 60 seconds of last OTP */
const RESEND_COOLDOWN_MS = 60 * 1000;

/** Maximum failed verification attempts before OTP is locked */
const MAX_ATTEMPTS = 5;

/**
 * Generate a cryptographically secure 6-digit numeric OTP.
 * Uses crypto.randomInt for uniform distribution — not Math.random().
 */
const generateSecureOtpCode = (): string => {
  return crypto.randomInt(100_000, 999_999).toString();
};

class CompanyOtpService {
  /**
   * Generate and persist a new OTP for a company.
   *
   * - Invalidates all prior unused OTPs of the same type first.
   * - Enforces a resend cooldown to prevent OTP flooding.
   * - Hashes the OTP before storing — raw code never persisted.
   *
   * Returns the plain OTP code for email dispatch. Never log or store this.
   */
  async generateOtp(companyId: string, type: OtpType): Promise<string> {
    // Check resend cooldown: only look at OTPs that are still active (not yet consumed)
    // This avoids blocking new requests after a successful password reset.
    const recent = await prisma.companyOtp.findFirst({
      where: { companyId, type, isUsed: false },
      orderBy: { createdAt: "desc" },
    });

    if (recent) {
      const msSinceLastOtp = Date.now() - recent.createdAt.getTime();
      if (msSinceLastOtp < RESEND_COOLDOWN_MS) {
        const secondsLeft = Math.ceil((RESEND_COOLDOWN_MS - msSinceLastOtp) / 1000);
        throw new ApiError(429, `Please wait ${secondsLeft} seconds before requesting a new OTP.`, {
          code: "OTP_RESEND_COOLDOWN",
        });
      }
    }

    // Invalidate all prior active OTPs for this company + type (both verified and unverified)
    await prisma.companyOtp.updateMany({
      where: {
        companyId,
        type,
        isUsed: false,
      },
      data: { isUsed: true },
    });

    const otpCode = generateSecureOtpCode();
    const hashedOtp = await bcrypt.hash(otpCode, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    await prisma.companyOtp.create({
      data: {
        companyId,
        code: hashedOtp,
        type,
        expiresAt,
      },
    });

    // Return plain OTP for email delivery — never persisted in plaintext
    return otpCode;
  }

  /**
   * Verify a submitted OTP for a company.
   *
   * - Checks existence, expiry, and attempt limit before comparing.
   * - Compares OTP first; ONLY increments the attempt counter on a mismatch.
   *   This prevents successful verifications from bloating the attempt count.
   * - Marks OTP as verified on success — consumed later at the reset-password step.
   *
   * Does NOT reset the password — that is a separate step.
   * Returns true on success; throws ApiError on any failure.
   */
  async verifyOtp(companyId: string, otp: string, type: OtpType): Promise<true> {
    const existingOtp = await prisma.companyOtp.findFirst({
      where: {
        companyId,
        type,
        isUsed: false,
        isVerified: false,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!existingOtp) {
      // Generic message — do not reveal whether OTP exists or was already used
      throw new ApiError(400, "Invalid or expired OTP.");
    }

    // Brute-force protection: reject immediately if attempt cap reached
    if (existingOtp.attempts >= MAX_ATTEMPTS) {
      throw new ApiError(429, "Too many failed attempts. Please request a new OTP.", {
        code: "OTP_MAX_ATTEMPTS_EXCEEDED",
      });
    }

    // Expiry check
    if (existingOtp.expiresAt.getTime() < Date.now()) {
      throw new ApiError(400, "OTP has expired. Please request a new one.");
    }

    // Compare first — only write an attempt increment on failure.
    // Incrementing before comparison would penalise correct submissions.
    const isMatch = await bcrypt.compare(otp, existingOtp.code);

    if (!isMatch) {
      // Persist the failed attempt so brute-force lock can trigger on next call
      await prisma.companyOtp.update({
        where: { id: existingOtp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new ApiError(401, "Invalid OTP.");
    }

    // OTP is valid — mark as verified; attempts remain unchanged
    await prisma.companyOtp.update({
      where: { id: existingOtp.id },
      data: { isVerified: true },
    });

    return true;
  }

  /**
   * Confirm that a verified OTP exists and has not been consumed.
   * Called by the reset-password step to validate the verification chain.
   * Returns the OTP record id on success.
   */
  async getVerifiedOtp(companyId: string, type: OtpType): Promise<string> {
    const verifiedOtp = await prisma.companyOtp.findFirst({
      where: {
        companyId,
        type,
        isVerified: true,
        isUsed: false,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!verifiedOtp) {
      throw new ApiError(400, "No verified OTP found. Please complete the OTP verification step first.");
    }

    // Ensure the verified OTP has not also expired
    if (verifiedOtp.expiresAt.getTime() < Date.now()) {
      throw new ApiError(400, "Verified OTP has expired. Please restart the password reset flow.");
    }

    return verifiedOtp.id;
  }

  /**
   * Consume (invalidate) a verified OTP after a successful password reset.
   * Prevents replay: once consumed, the OTP can never be reused.
   */
  async consumeVerifiedOtp(otpId: string): Promise<void> {
    await prisma.companyOtp.update({
      where: { id: otpId },
      data: { isUsed: true },
    });
  }

  /**
   * Invalidate all OTPs for a company+type.
   * Used as a cleanup safety measure after a successful password reset.
   */
  async invalidateAllOtps(companyId: string, type: OtpType): Promise<void> {
    await prisma.companyOtp.updateMany({
      where: { companyId, type },
      data: { isUsed: true },
    });
  }
}

export default new CompanyOtpService();

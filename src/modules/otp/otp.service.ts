import bcrypt from "bcrypt";
import { OtpType } from "@prisma/client";
import prisma from "../../config/prisma";
import ApiError from "../../utils/apiError";

class otpService {
  private generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async generateOtp(userId: string, type: OtpType) {
    // 1. Delete Old Unused OTP
    await prisma.otp.deleteMany({
      where: {
        userId,
        type,
        isUsed: false,
      },
    });

    // 2. Generate OTP
    const otpCode = this.generateOtpCode();

    // 3. Hash OTP before saving
    const hashedOtp = await bcrypt.hash(otpCode, 10);

    // 4. Set Expiry (90 Seconds)
    const expiresAt = new Date(Date.now() + 90 * 1000);

    // 5. Save in DB
    await prisma.otp.create({
      data: {
        userId,
        code: hashedOtp,
        type,
        expiresAt,
      },
    });

    // 6 Return Otp
    return otpCode;
  }

  async verifyOtp(userId: string, otp: string, type: OtpType) {
    const existingOtp = await prisma.otp.findFirst({
      where: {
        userId,
        type,
        isUsed: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!existingOtp) {
      throw new ApiError(404, "OTP not found");
    }

    // Safety check
    if (!existingOtp.expiresAt) {
      throw new ApiError(500, "OTP expiry is missing");
    }

    // Check Expiry
    if (existingOtp.expiresAt.getTime() < Date.now()) {
      throw new ApiError(400, "OTP expired");
    }

    const isMatch = await bcrypt.compare(otp, existingOtp.code);
    if (!isMatch) {
      throw new ApiError(401, "Invalid OTP");
    }

    await prisma.otp.update({
      where: { otpId: existingOtp.otpId },
      data: { isUsed: true },
    });

    return true;
  }
}

export default new otpService();

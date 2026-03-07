import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
class otpService {
  private generateOtpCode(): string {
    return Math.floor(10000 + Math.random() * 90000).toString();
  }

  async generateOtp(userId: string, type: string) {
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

    // 4. Set Expiry (1 Minute)
    const expiresAt = new Date(Date.now() + 1 * 60 * 1000);

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

  async verifyOtp(userId: string, otp: string, type: string) {
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
      throw new Error("OTP Not Found");
    }

    // Safety check
    if (!existingOtp.expiresAt) {
      throw new Error("OTP Expiry Missing");
    }

    // Check Expiry
    if (existingOtp.expiresAt.getTime() < Date.now()) {
      throw new Error("OTP Expired");
    }

    const isMatch = await bcrypt.compare(otp, existingOtp.code);
    if (!isMatch) {
      throw new Error("Invalid OTP");
    }

    await prisma.otp.update({
      where: { otpId: existingOtp.otpId },
      data: { isUsed: true },
    });

    return true;
  }
}

export default new otpService();

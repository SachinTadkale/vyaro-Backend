import { VerificationStatus } from "@prisma/client";
import prisma from "../../config/prisma";

export const createKyc = async (
  userId: string,
  data: any,
  frontImage: string,
  backImage?: string
) => {
  const existing = await prisma.kyc.findUnique({
    where: { userId },
  });

  if (existing) {
    throw new Error("KYC already submitted");
  }

  const kyc = await prisma.kyc.create({
    data: {
      userId,
      docType: data.docType,
      docNo: data.docNo,
      frontImage,
      backImage,
    },
  });

  await prisma.user.update({
    where: { user_id: userId },
    data: {
      registrationStep: 4,
      verificationStatus: VerificationStatus.PENDING,
    },
  });

  return kyc;
};

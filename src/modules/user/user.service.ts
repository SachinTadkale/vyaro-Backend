import prisma from "../../config/prisma";
import cloudinary from "../../config/cloudinary";

export const uploadKycService = async (
  userId: string,
  file: any,
  docNo: string
) => {
  // Check if KYC already exists
  const existingKyc = await prisma.kyc.findUnique({
    where: { userId },
  });

  if (existingKyc) {
    throw new Error("KYC already submitted");
  }

  const upload = await cloudinary.uploader.upload(file.path);

  return prisma.kyc.create({
    data: {
      userId,
      docType: "AADHAR",
      docNo,
      frontImage: upload.secure_url,
    },
  });
};
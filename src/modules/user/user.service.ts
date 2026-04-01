import prisma from "../../config/prisma";
import cloudinary from "../../config/cloudinary";
import ApiError from "../../utils/apiError";

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
    throw new ApiError(409, "KYC already submitted");
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

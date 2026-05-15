/**
 * Module: User.service
 * Purpose: Implements the User.service module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import prisma from "../../config/prisma";
import cloudinary from "../../config/cloudinary";
import ApiError from "../../utils/apiError";

/**
 * Upload Kyc Service.
 */
export const uploadKycService = async (
  userId: string,
  file: any,
  docNo: string
) => {
  // Check if KYC already exists
  const existingKyc = await prisma.kyc.findFirst({
    where: { userId },
  });

  if (existingKyc) {
    throw new ApiError(409, "KYC already submitted");
  }

  const upload = await cloudinary.uploader.upload(file.path);

  return prisma.kyc.create({
    data: {
      userId,
      docType: "AADHAAR",
      docNo,
      frontImage: upload.secure_url,
    },
  });
};

/**
 * Update Profile Image.
 */
export const updateProfileImage = async (userId: string, file: any) => {
  const upload = await cloudinary.uploader.upload(file.path, {
    folder: "profile_images",
  });

  return prisma.user.update({
    where: { user_id: userId },
    data: { profileImage: upload.secure_url },
    select: {
      user_id: true,
      name: true,
      profileImage: true,
    },
  });
};

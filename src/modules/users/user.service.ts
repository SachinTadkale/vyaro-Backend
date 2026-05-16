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

import { uploadToCloudinary } from "../../config/cloudinary";

/**
 * Update Profile Image.
 */
export const updateProfileImage = async (userId: string, file: any) => {
  const upload = await uploadToCloudinary(file.path, "profile_images");

  return prisma.user.update({
    where: { user_id: userId },
    data: { profileImage: upload.url },
    select: {
      user_id: true,
      name: true,
      profileImage: true,
    },
  });
};

/**
 * Get Me / Profile
 */
export const getUserProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: {
      user_id: true,
      name: true,
      email: true,
      role: true,
      verificationStatus: true,
      profileImage: true,
      location: true,
      publicProfileId: true,
      qrShareToken: true,
    },
  });

  if (!user) throw new ApiError(404, "User not found");

  // Fetch stats separately to avoid complex _count/aggregate issues
  const [cropCount, listingCount, orderCount, revenueResult] = await Promise.all([
    prisma.product.count({ where: { userId } }),
    prisma.marketListing.count({ where: { sellerId: userId, status: "ACTIVE" } }),
    prisma.order.count({ where: { sellerId: userId } }),
    prisma.order.aggregate({
      where: { 
        sellerId: userId,
        orderStatus: "COMPLETED" 
      },
      _sum: {
        finalPrice: true,
      }
    })
  ]);

  return {
    ...user,
    cropCount,
    listingCount,
    orderCount,
    revenue: revenueResult._sum.finalPrice || 0,
  };
};

/**
 * Update User Profile
 */
export const updateUserProfile = async (userId: string, data: { name?: string, location?: string, email?: string }) => {
  return prisma.user.update({
    where: { user_id: userId },
    data,
    select: {
      user_id: true,
      name: true,
      location: true,
      email: true,
      profileImage: true,
      verificationStatus: true,
    }
  });
};

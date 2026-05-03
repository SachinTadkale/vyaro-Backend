/**
 * Module: Kyc.service
 * Purpose: Implements the Kyc.service module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import prisma from "../../config/prisma";
import ApiError from "../../utils/apiError";
import { validateKycRules, validateDocTypeForRole } from "./kyc.rules";

/**
 * Create Kyc.
 */
export const createKyc = async (
  userId: string,
  data: any,
  frontImage: string,
  backImage?: string,
) => {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: { role: true, registrationStep: true },
  });

  if (!user) throw new ApiError(404, "User not found");

  // 🔒 Restrict doc types
  validateDocTypeForRole(user.role, data.docType);

  // 🔁 Prevent duplicate doc upload
  const existingDoc = await prisma.kyc.findFirst({
    where: {
      userId,
      docType: data.docType,
    },
  });

  if (existingDoc) {
    throw new ApiError(409, `${data.docType} already uploaded`);
  }

  // 📄 Aadhaar must have front + back
  if (data.docType === "AADHAAR" && !backImage) {
    throw new ApiError(400, "Aadhaar back image required");
  }

  // 💾 Save doc
  const kyc = await prisma.kyc.create({
    data: {
      userId,
      docType: data.docType,
      docNo: data.docNo,
      frontImage,
      backImage,
    },
  });

  // 🔍 Validate full KYC
  const docs = await prisma.kyc.findMany({
    where: { userId },
  });

  try {
    validateKycRules(user.role, docs);

    // ✅ Only after valid KYC
    await prisma.user.update({
      where: {
        user_id: userId,
        registrationStep: { lt: 4 },
      },
      data: {
        registrationStep: 4,
      },
    });
  } catch (err) {
    // do nothing → allow partial uploads
  }

  return kyc;
};

/**
 * Create Delivery Kyc (Bulk).
 */
export const createDeliveryKyc = async (
  userId: string,
  data: {
    idType: "AADHAAR" | "PAN";
    idNumber: string;
    idFrontUrl: string;
    idBackUrl?: string;
    licenseUrl: string;
    rcUrl: string;
  },
) => {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: { role: true },
  });

  if (!user) throw new ApiError(404, "User not found");
  if (user.role !== "DELIVERY_PARTNER") {
    throw new ApiError(403, "Only delivery partners can use this endpoint");
  }

  // Use transaction to ensure all docs are saved
  return await prisma.$transaction(async (tx) => {
    // 1. Save ID
    await tx.kyc.create({
      data: {
        userId,
        docType: data.idType as any,
        docNo: data.idNumber,
        frontImage: data.idFrontUrl,
        backImage: data.idBackUrl,
      },
    });

    // 2. Save Driving License
    await tx.kyc.create({
      data: {
        userId,
        docType: "DRIVING_LICENSE",
        docNo: "DL-" + userId.substring(0, 8), // Placeholder or extracted if needed
        frontImage: data.licenseUrl,
      },
    });

    // 3. Save RC
    await tx.kyc.create({
      data: {
        userId,
        docType: "VEHICLE_RC",
        docNo: "RC-" + userId.substring(0, 8),
        frontImage: data.rcUrl,
      },
    });

    // 4. Update registration step
    await tx.user.update({
      where: { user_id: userId },
      data: { registrationStep: 4 },
    });

    return { message: "Delivery KYC documents uploaded successfully" };
  });
};

/**
 * Module: Company.service
 * Purpose: Implements the Company.service module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import prisma from "../../config/prisma";
import ApiError from "../../utils/apiError";

/**
 * Get Company Profile Service.
 */
export const getCompanyProfileService = async (companyId: string) => {
  const company = await prisma.company.findUnique({
    where: { companyId },
    select: {
      companyId: true,
      companyName: true,
      registrationNo: true,
      hqLocation: true,
      gstNumber: true,
      email: true,
      gstCertificateUrl: true,
      licenseDocUrl: true,
      verification: true,
      profileImageUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  return company;
};

/**
 * Update Company Profile Image Service.
 */
export const updateCompanyProfileImageService = async (
  companyId: string,
  profileImageUrl: string
) => {
  const company = await prisma.company.update({
    where: { companyId },
    data: { profileImageUrl },
    select: {
      profileImageUrl: true,
    },
  });

  return company;
};

/**
 * Delete Company Profile Image Service.
 */
export const deleteCompanyProfileImageService = async (companyId: string) => {
  const company = await prisma.company.update({
    where: { companyId },
    data: { profileImageUrl: null },
    select: {
      profileImageUrl: true,
    },
  });

  return company;
};

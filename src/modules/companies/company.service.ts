import prisma from "../../config/prisma";
import ApiError from "../../utils/apiError";

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

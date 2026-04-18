import { VerificationStatus } from "@prisma/client";
import prisma from "../../config/prisma";

const companyPublicSelect = {
  companyId: true,
  companyName: true,
  registrationNo: true,
  hqLocation: true,
  gstNumber: true,
  email: true,
  gstCertificateUrl: true,
  licenseDocUrl: true,
  profileImageUrl: true,
  verification: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const createCompany = async (data: any) => {
  return prisma.company.create({
    data,
    select: companyPublicSelect,
  });
};

export const findCompanyByRegistration = async (registrationNo: string) => {
  return prisma.company.findUnique({
    where: { registrationNo }
  });
};

export const updateCompanyDocs = async (
  companyId: string,
  gstUrl: string,
  licenseUrl: string
) => {
  return prisma.company.update({
    where: { companyId },
    data: {
      gstCertificateUrl: gstUrl,
      licenseDocUrl: licenseUrl,
    },
    select: companyPublicSelect,
  });
};

export const verifyCompany = async (companyId: string) => {
  return prisma.company.update({
    where: { companyId },
    data: {
      verification: VerificationStatus.VERIFIED,
    },
    select: companyPublicSelect,
  });
};

export const updateCompanyPassword = async (
  companyId: string,
  password: string
) => {
  return prisma.company.update({
    where: { companyId },
    data: {
      password
    }
  });
};

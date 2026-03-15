import { VerificationStatus } from "@prisma/client";
import prisma from "../../config/prisma";

export const createCompany = async (data: any) => {
  return prisma.company.create({
    data
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
      licenseDocUrl: licenseUrl
    }
  });
};

export const verifyCompany = async (companyId: string) => {
  return prisma.company.update({
    where: { companyId },
    data: {
      verification: VerificationStatus.VERIFIED
    }
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

/**
 * Module: Company Auth.repository
 * Purpose: Implements the Company Auth.repository module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
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

/**
 * Create Company.
 */
export const createCompany = async (data: any) => {
  return prisma.company.create({
    data,
    select: companyPublicSelect,
  });
};

/**
 * Find Company By Registration.
 */
export const findCompanyByRegistration = async (registrationNo: string) => {
  return prisma.company.findUnique({
    where: { registrationNo }
  });
};

/**
 * Update Company Docs.
 */
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

/**
 * Verify Company.
 */
export const verifyCompany = async (companyId: string) => {
  return prisma.company.update({
    where: { companyId },
    data: {
      verification: VerificationStatus.VERIFIED,
    },
    select: companyPublicSelect,
  });
};

/**
 * Update Company Password.
 */
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

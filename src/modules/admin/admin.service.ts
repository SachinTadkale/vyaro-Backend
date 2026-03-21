import { VerificationStatus } from "@prisma/client";
import prisma from "../../config/prisma";
import { sendApprovalEmail } from "../../lib/email";

// Get pending KYC users
export const getPendingKyc = async () => {
  return prisma.user.findMany({
    where: {
      verificationStatus: VerificationStatus.PENDING,
      kyc: {
        isNot: null,
      },
    },
    include: {
      kyc: true,
    },
  });
};

// Get pending KYC Comapanies
export const getPendingCompanyVerifications = async () => {
  return prisma.company.findMany({
    where: {
      verification: VerificationStatus.PENDING,
      gstCertificateUrl: {
        not: null,
      },
      licenseDocUrl: {
        not: null,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

// Approve company
export const approveCompany = async (companyId: string) => {
  const company = await prisma.company.findUnique({
    where: { companyId },
  });

  if (!company) throw new Error("Company not found");

  if (!company.gstCertificateUrl || !company.licenseDocUrl) {
    throw new Error("Company documents are not uploaded");
  }

  if (company.verification === VerificationStatus.VERIFIED) {
    throw new Error("Company already verified");
  }

  await prisma.company.update({
    where: { companyId },
    data: {
      verification: VerificationStatus.VERIFIED,
    },
  });

  return { message: "Company approved successfully" };
};

// Reject company
export const rejectCompany = async (companyId: string) => {
  const company = await prisma.company.findUnique({
    where: { companyId },
  });

  if (!company) throw new Error("Company not found");

  if (!company.gstCertificateUrl || !company.licenseDocUrl) {
    throw new Error("Company documents are not uploaded");
  }

  if (company.verification === VerificationStatus.REJECTED) {
    throw new Error("Company already rejected");
  }

  await prisma.company.update({
    where: { companyId },
    data: {
      verification: VerificationStatus.REJECTED,
    },
  });

  return { message: "Company rejected successfully" };
};


// Approve user
export const verifyUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
  });

  if (!user) throw new Error("User not found");

  if (user.verificationStatus === VerificationStatus.VERIFIED) {
    throw new Error("User already verified");
  }

  await prisma.user.update({
    where: { user_id: userId },
    data: {
      verificationStatus: VerificationStatus.VERIFIED,
    },
  });

  const message = "Your Farmzy account has been verified. You can now login.";

  await prisma.notification.create({
    data: {
      userId,
      message,
    },
  });

  await sendApprovalEmail(user.email!, user.name);
  return { message: "User approved successfully" };
};

// Reject user
export const rejectUser = async (userId: string, reason?: string) => {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
  });

  if (!user) throw new Error("User not found");

  await prisma.user.update({
    where: { user_id: userId },
    data: {
      verificationStatus: VerificationStatus.REJECTED,
    },
  });

  const message = reason
    ? `Your account verification was rejected. Reason: ${reason}`
    : "Your account verification was rejected.";

  await prisma.notification.create({
    data: {
      userId,
      message,
    },
  });

  return { message: "User rejected successfully" };
};

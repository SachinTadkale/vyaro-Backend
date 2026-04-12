import { VerificationStatus } from "@prisma/client";
import prisma from "../../config/prisma";
import { sendApprovalEmail } from "../../lib/email";
import ApiError from "../../utils/apiError";

const formatDate = (value: Date) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

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

export const getAdminStats = async () => {
  const [
    totalFarmers,
    pendingKyc,
    verifiedUsers,
    blockedAccounts,
    partnerCompanies,
    pendingCompanies,
    totalOrders,
    totalListings,
  ] = await prisma.$transaction([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.user.count({
      where: {
        role: "USER",
        verificationStatus: VerificationStatus.PENDING,
      },
    }),
    prisma.user.count({
      where: {
        role: "USER",
        verificationStatus: VerificationStatus.VERIFIED,
      },
    }),
    prisma.user.count({ where: { isBlocked: true } }),
    prisma.company.count(),
    prisma.company.count({
      where: {
        verification: VerificationStatus.PENDING,
      },
    }),
    prisma.order.count(),
    prisma.marketListing.count(),
  ]);

  return {
    totalFarmers,
    pendingKyc,
    verifiedUsers,
    blockedAccounts,
    partnerCompanies,
    pendingCompanies,
    totalOrders,
    totalListings,
  };
};

export const getUsers = async () => {
  const users = await prisma.user.findMany({
    where: {
      role: "USER",
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      farmDetails: true,
      kyc: true,
      bankDetails: true,
      _count: {
        select: {
          listings: true,
        },
      },
    },
  });

  const sellerIds = users.map((user) => user.user_id);
  const orderGroups = sellerIds.length
    ? await prisma.order.groupBy({
        by: ["sellerId"],
        where: {
          sellerId: {
            in: sellerIds,
          },
        },
        _count: {
          _all: true,
        },
      })
    : [];

  const orderCountMap = new Map(
    orderGroups.map((group) => [group.sellerId, group._count._all])
  );

  return users.map((user) => ({
    id: user.user_id,
    name: user.name,
    email: user.email ?? "",
    phone: user.phone_no,
    gender: user.gender ?? "N/A",
    location:
      [
        user.farmDetails?.district,
        user.farmDetails?.state,
      ]
        .filter(Boolean)
        .join(", ") || user.address,
    address: user.address,
    state: user.farmDetails?.state ?? "N/A",
    district: user.farmDetails?.district ?? "N/A",
    village: user.farmDetails?.village ?? "N/A",
    landArea: user.farmDetails?.landArea
      ? `${user.farmDetails.landArea} Acres`
      : "N/A",
    bankInfo: {
      bankName: user.bankDetails?.bankName ?? "N/A",
      accountNumber: user.bankDetails?.accountNumberLast4 ?? "N/A",
      ifsc: user.bankDetails?.ifscLast4 ?? "N/A",
    },
    kycStatus: user.verificationStatus,
    status: user.isBlocked ? "BLOCKED" : "ACTIVE",
    joinedDate: formatDate(user.createdAt),
    activity: {
      totalListings: user._count.listings,
      totalOrders: orderCountMap.get(user.user_id) ?? 0,
      lastActive: formatDate(user.updatedAt),
    },
    kyc: user.kyc
      ? {
          docType: user.kyc.docType,
          docNumber: user.kyc.docNo,
          primaryDocUrl: user.kyc.frontImage,
          secondaryDocUrl: user.kyc.backImage,
          submittedAt: formatDate(user.kyc.createdAt),
        }
      : null,
  }));
};

export const getCompanies = async () => {
  const companies = await prisma.company.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: {
          orders: true,
        },
      },
    },
  });

  const companyIds = companies.map((company) => company.companyId);
  const purchaseTotals = companyIds.length
    ? await prisma.order.groupBy({
        by: ["companyId"],
        where: {
          companyId: {
            in: companyIds,
          },
        },
        _sum: {
          finalPrice: true,
        },
      })
    : [];

  const purchaseMap = new Map(
    purchaseTotals.map((item) => [item.companyId, item._sum.finalPrice ?? 0])
  );

  return companies.map((company) => ({
    id: company.companyId,
    companyName: company.companyName,
    email: company.email,
    phone: "N/A",
    location: company.hqLocation,
    gstNumber: company.gstNumber,
    regNumber: company.registrationNo,
    hqLocation: company.hqLocation,
    kycStatus: company.verification,
    status:
      company.verification === VerificationStatus.REJECTED
        ? "BLOCKED"
        : "ACTIVE",
    joinedDate: formatDate(company.createdAt),
    activity: {
      totalOrders: company._count.orders,
      activeListings: 0,
      purchaseVolume: formatCurrency(purchaseMap.get(company.companyId) ?? 0),
    },
    documents: {
      gstCertificateUrl: company.gstCertificateUrl,
      licenseDocUrl: company.licenseDocUrl,
    },
  }));
};

export const getOrders = async () => {
  const orders = await prisma.order.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
    select: {
      orderId: true,
      sellerId: true,
      productName: true,
      quantity: true,
      productUnit: true,
      finalPrice: true,
      orderStatus: true,
      paymentStatus: true,
      createdAt: true,
      company: {
        select: {
          companyName: true,
        },
      },
      delivery: {
        select: {
          status: true,
        },
      },
      disputes: {
        where: {
          status: {
            in: ["OPEN", "UNDER_REVIEW"],
          },
        },
        select: {
          id: true,
        },
      },
    },
  });

  const sellerIds = [...new Set(orders.map((order) => order.sellerId))];
  const sellers = sellerIds.length
    ? await prisma.user.findMany({
        where: {
          user_id: {
            in: sellerIds,
          },
        },
        select: {
          user_id: true,
          name: true,
        },
      })
    : [];

  const sellerMap = new Map(sellers.map((seller) => [seller.user_id, seller.name]));

  return orders.map((order) => ({
    id: order.orderId,
    farmer: sellerMap.get(order.sellerId) ?? "Unknown Farmer",
    company: order.company.companyName,
    product: `${order.productName} - ${order.quantity} ${order.productUnit}`,
    amount: formatCurrency(order.finalPrice),
    status:
      order.disputes.length > 0
        ? "Disputed"
        : order.orderStatus === "DELIVERED" || order.orderStatus === "COMPLETED"
          ? "Delivered"
          : order.orderStatus === "CANCELLED" || order.orderStatus === "REJECTED"
            ? "Cancelled"
            : order.delivery?.status === "IN_TRANSIT"
              ? "In Transit"
              : "Pending",
    date: formatDate(order.createdAt),
  }));
};

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

export const approveCompany = async (companyId: string) => {
  const company = await prisma.company.findUnique({
    where: { companyId },
  });

  if (!company) throw new ApiError(404, "Company not found");

  if (!company.gstCertificateUrl || !company.licenseDocUrl) {
    throw new ApiError(400, "Company documents are not uploaded");
  }

  if (company.verification === VerificationStatus.VERIFIED) {
    throw new ApiError(409, "Company already verified");
  }

  await prisma.company.update({
    where: { companyId },
    data: {
      verification: VerificationStatus.VERIFIED,
    },
  });

  return { message: "Company approved successfully" };
};

export const rejectCompany = async (companyId: string) => {
  const company = await prisma.company.findUnique({
    where: { companyId },
  });

  if (!company) throw new ApiError(404, "Company not found");

  if (!company.gstCertificateUrl || !company.licenseDocUrl) {
    throw new ApiError(400, "Company documents are not uploaded");
  }

  if (company.verification === VerificationStatus.REJECTED) {
    throw new ApiError(409, "Company already rejected");
  }

  await prisma.company.update({
    where: { companyId },
    data: {
      verification: VerificationStatus.REJECTED,
    },
  });

  return { message: "Company rejected successfully" };
};

export const verifyUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
  });

  if (!user) throw new ApiError(404, "User not found");

  if (user.verificationStatus === VerificationStatus.VERIFIED) {
    throw new ApiError(409, "User already verified");
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

  if (user.email) {
    await sendApprovalEmail(user.email, user.name);
  }

  return { message: "User approved successfully" };
};

export const rejectUser = async (userId: string, reason?: string) => {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
  });

  if (!user) throw new ApiError(404, "User not found");

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

export const blockUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
  });

  if (!user) throw new ApiError(404, "User not found");

  if (user.isBlocked) {
    throw new ApiError(409, "User already blocked");
  }

  await prisma.user.update({
    where: { user_id: userId },
    data: {
      isBlocked: true,
    },
  });

  return { message: "User blocked successfully" };
};

export const unblockUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
  });

  if (!user) throw new ApiError(404, "User not found");

  if (!user.isBlocked) {
    throw new ApiError(409, "User is not blocked");
  }

  await prisma.user.update({
    where: { user_id: userId },
    data: {
      isBlocked: false,
    },
  });

  return { message: "User unblocked successfully" };
};

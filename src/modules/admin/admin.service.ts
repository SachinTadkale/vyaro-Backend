/**
 * Module: Admin.service
 * Purpose: Implements the Admin.service module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { VerificationStatus } from "@prisma/client";
import prisma from "../../config/prisma";
import ApiError from "../../utils/apiError";

const platformUsers = ["DELIVERY_PARTNER", "FARMER"];

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

/**
 * Get Pending Kyc.
 */
export const getPendingKyc = async () => {
  return prisma.user.findMany({
    where: {
      verificationStatus: VerificationStatus.PENDING,
      role: {
        in: ["FARMER", "DELIVERY_PARTNER"], // optional but recommended
      },
      kyc: {
        some: {},
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      farmDetails: true,
      bankDetails: true,
      deliveryPartner: true,
      kyc: {
        select: {
          kycId: true,
          docType: true,
          docNo: true,
          frontImage: true,
          backImage: true,
          createdAt: true,
        },
      },
    },
  });
};

/**
 * Get Admin Stats.
 */
export const getAdminStats = async () => {
  const [
    totalUsers,
    pendingKyc,
    verifiedUsers,
    blockedAccounts,
    partnerCompanies,
    pendingCompanies,
    totalOrders,
    totalListings,
  ] = await prisma.$transaction([
    prisma.user.count({
      where: {
        role: {
          in: ["DELIVERY_PARTNER", "FARMER"],
        },
      },
    }),
    prisma.user.count({
      where: {
        role: {
          in: ["DELIVERY_PARTNER", "FARMER"],
        },
        verificationStatus: VerificationStatus.PENDING,
      },
    }),
    prisma.user.count({
      where: {
        role: {
          in: ["DELIVERY_PARTNER", "FARMER"],
        },
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
    totalUsers,
    pendingKyc,
    verifiedUsers,
    blockedAccounts,
    partnerCompanies,
    pendingCompanies,
    totalOrders,
    totalListings,
  };
};

/**
 * Get Users.
 */
export const getUsers = async () => {
  const users = await prisma.user.findMany({
    where: {
      role: {
        in: ["DELIVERY_PARTNER", "FARMER"],
      },
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
    orderGroups.map((group) => [group.sellerId, group._count._all]),
  );

  return users.map((user) => ({
    id: user.user_id,
    name: user.name,
    email: user.email ?? "",
    phone: user.phone_no,
    gender: user.gender ?? "N/A",
    role: user.role ?? "Unknown",
    location:
      [user.farmDetails?.district, user.farmDetails?.state]
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
    kyc:
      user.kyc.length > 0
        ? {
          documents: user.kyc.map((doc) => ({
            docNo: doc.docNo,
            docType: doc.docType,
            frontImage: doc.frontImage,
            backImage: doc.backImage,
            submittedAt: formatDate(doc.createdAt),
          })),
        }
        : [],
  }));
};

/**
 * Get Companies.
 */
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
    purchaseTotals.map((item) => [item.companyId, item._sum.finalPrice ?? 0]),
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

/**
 * Get Orders.
 */
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

  const sellerMap = new Map(
    sellers.map((seller) => [seller.user_id, seller.name]),
  );

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
          : order.orderStatus === "CANCELLED" ||
            order.orderStatus === "REJECTED"
            ? "Cancelled"
            : order.delivery?.status === "IN_TRANSIT"
              ? "In Transit"
              : "Pending",
    date: formatDate(order.createdAt),
  }));
};

/**
 * Get Pending Company Verifications.
 */
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
    select: {
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
    },
  });
};

/**
 * Approve Company.
 */
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

  return {
    message: "Company approved successfully",
    notificationPayload: company.email
      ? {
          company: {
            id: company.companyId,
            name: company.companyName,
            email: company.email,
          },
        }
      : undefined,
  };
};

/**
 * Reject Company.
 */
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

  return {
    message: "Company rejected successfully",
    notificationPayload: company.email
      ? {
          company: {
            id: company.companyId,
            name: company.companyName,
            email: company.email,
          },
          metadata: {
            reason: "Company documents did not meet verification standards.",
          },
        }
      : undefined,
  };
};

/**
 * Verify User.
 */
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

  return {
    message: "User approved successfully",
    notificationPayload: user.email
      ? {
        user: {
          id: user.user_id,
          name: user.name,
          email: user.email,
        },
      }
      : undefined,
  };
};

/**
 * Reject User.
 */
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

  return {
    message: "User rejected successfully",
    notificationPayload: user.email
      ? {
        user: {
          id: user.user_id,
          name: user.name,
          email: user.email,
        },
        metadata: {
          reason,
        },
      }
      : undefined,
  };
};

/**
 * Block User.
 */
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

/**
 * Unblock User.
 */
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

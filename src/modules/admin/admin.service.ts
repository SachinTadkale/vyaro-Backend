import prisma from "../../config/prisma";
import {
  sendApprovalEmail,
  sendRejectionEmail,
} from "../../lib/email";

// Get pending KYC users
export const getPendingKyc = async () => {
  return prisma.user.findMany({
    where: {
      verificationStatus: "PENDING",
      kyc: {
        isNot: null,
      },
    },
    include: {
      kyc: true,
    },
  });
};

// Approve user
export const verifyUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
  });

  if (!user) throw new Error("User not found");

  if (user.verificationStatus === "APPROVED") {
    throw new Error("User already approved");
  }

  await prisma.user.update({
    where: { user_id: userId },
    data: {
      verificationStatus: "APPROVED",
    },
  });

  const message =
    "Your account has been verified. You can now login.";

  await prisma.notification.create({
    data: {
      userId,
      message,
    },
  });

  await sendApprovalEmail(user.email, user.name);

  return { message: "User approved successfully" };
};

// Reject user
export const rejectUser = async (
  userId: string,
  reason?: string
) => {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
  });

  if (!user) throw new Error("User not found");

  await prisma.user.update({
    where: { user_id: userId },
    data: {
      verificationStatus: "REJECTED",
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

  await sendRejectionEmail(
    user.email,
    user.name,
    reason
  );

  return { message: "User rejected successfully" };
};

// Block user
export const blockUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
  });

  if (!user) throw new Error("User not found");

  if (user.isBlocked) {
    throw new Error("User already blocked");
  }

  await prisma.user.update({
    where: { user_id: userId },
    data: { isBlocked: true },
  });

  return { message: "User blocked successfully" };
};

// Unblock user
export const unblockUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
  });

  if (!user) throw new Error("User not found");

  if (!user.isBlocked) {
    throw new Error("User is not blocked");
  }

  await prisma.user.update({
    where: { user_id: userId },
    data: { isBlocked: false },
  });

  return { message: "User unblocked successfully" };
};
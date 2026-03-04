import prisma from "../../config/prisma";

export const addBank = async (userId: string, data: any) => {
  const existing = await prisma.bankDetails.findUnique({
    where: { userId },
  });

  if (existing) {
    throw new Error("Bank details already added");
  }

  const bank = await prisma.bankDetails.create({
    data: {
      userId,
      accountHolder: data.accountHolder,
      bankName: data.bankName,
      accountNumber: data.accountNumber,
      ifsc: data.ifsc,
    },
  });

  await prisma.user.update({
    where: { user_id: userId },
    data: { registrationStep: 3 },
  });

  return {
    message: "Bank details added successfully",
    bank,
  };
};
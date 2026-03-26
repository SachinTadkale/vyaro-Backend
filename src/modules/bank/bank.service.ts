import prisma from "../../config/prisma";
import ApiError from "../../utils/apiError";
import { encrypt } from "../../utils/encryption";
import { BankInput } from "./bank.validation";

const maskAccountNumber = (lastFourDigits: string) => `**** **** ${lastFourDigits}`;

const maskIfsc = (lastFourCharacters: string) => `XXXXXXX${lastFourCharacters}`;

const formatBankDetails = (bank: {
  id: string;
  accountHolder: string;
  bankName: string;
  accountNumberLast4: string;
  ifscLast4: string;
}) => ({
  id: bank.id,
  accountHolder: bank.accountHolder,
  bankName: bank.bankName,
  accountNumber: maskAccountNumber(bank.accountNumberLast4),
  ifsc: maskIfsc(bank.ifscLast4),
});

export const addBank = async (userId: string, data: BankInput) => {
  const existing = await prisma.bankDetails.findFirst({
    where: { userId },
    select: {
      id: true,
    },
  });

  if (existing) {
    throw new ApiError(409, "Bank details already added", {
      code: "BANK_DETAILS_ALREADY_EXISTS",
    });
  }

  const encryptedAccountNumber = encrypt(data.accountNumber);
  const encryptedIfsc = encrypt(data.ifsc);

  const bank = await prisma.bankDetails.create({
    data: {
      userId,
      accountHolder: data.accountHolder,
      bankName: data.bankName,
      accountNumberEncrypted: encryptedAccountNumber.encryptedData,
      accountNumberIV: encryptedAccountNumber.iv,
      accountNumberLast4: data.accountNumber.slice(-4),
      ifscEncrypted: encryptedIfsc.encryptedData,
      ifscIV: encryptedIfsc.iv,
      ifscLast4: data.ifsc.slice(-4),
    },
    select: {
      id: true,
      accountHolder: true,
      bankName: true,
      accountNumberLast4: true,
      ifscLast4: true,
    },
  });

  await prisma.user.update({
    where: { user_id: userId },
    data: { registrationStep: 3 },
  });

  return formatBankDetails(bank);
};

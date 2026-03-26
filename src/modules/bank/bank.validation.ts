import { z } from "zod";

export const bankSchema = z.object({
  accountHolder: z.string().trim().min(2, "accountHolder must be at least 2 characters"),
  bankName: z.string().trim().min(2, "bankName must be at least 2 characters"),
  accountNumber: z
    .string()
    .trim()
    .regex(/^\d{9,18}$/, "accountNumber must be 9 to 18 digits"),
  ifsc: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "ifsc must be a valid IFSC code"),
});

export type BankInput = z.infer<typeof bankSchema>;

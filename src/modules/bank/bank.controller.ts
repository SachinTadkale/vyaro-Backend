import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import ApiError from "../../utils/apiError";
import * as bankService from "./bank.service";
import { bankSchema } from "./bank.validation";

export const addBankDetails = asyncHandler(async (req: Request, res: Response) => {
  const result = bankSchema.safeParse(req.body);

  if (!result.success) {
    const message = result.error.issues.map((issue) => issue.message).join(", ");
    throw new ApiError(400, message || "Validation failed");
  }

  const bank = await bankService.addBank(req.user.userId, result.data);

  return res.status(201).json({
    success: true,
    message: "Bank details added successfully",
    data: bank,
  });
});

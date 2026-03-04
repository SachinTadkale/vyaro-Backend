import { Request, Response } from "express";
import * as bankService from "./bank.service";

export const addBankDetails = async (
  req: any,
  res: Response
) => {
  try {
    const result = await bankService.addBank(
      req.user.userId,
      req.body
    );

    return res.status(201).json({
      success: true,
      message: result.message,
      data: result.bank,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
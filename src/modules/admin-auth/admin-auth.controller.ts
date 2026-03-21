import { Request, Response } from "express";
import * as adminAuthService from "./admin-auth.service";
import asyncHandler from "../../utils/asyncHandler";

export const loginAdminController = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await adminAuthService.loginAdmin(req.body);

    return res.status(200).json({
      success: true,
      token: result.token,
    });
  }
);

export const forgotPasswordAdminController = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await adminAuthService.forgotPasswordAdmin(req.body);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  }
);

export const resetPasswordAdminController = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await adminAuthService.resetPasswordAdmin(req.body);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  }
);

import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import * as adminService from "./admin.service";

export const getAdminStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await adminService.getAdminStats();

  return res.status(200).json({
    success: true,
    data: stats,
  });
});

export const getUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await adminService.getUsers();

  return res.status(200).json({
    success: true,
    data: users,
  });
});

export const getCompanies = asyncHandler(async (_req: Request, res: Response) => {
  const companies = await adminService.getCompanies();

  return res.status(200).json({
    success: true,
    data: companies,
  });
});

export const getOrders = asyncHandler(async (_req: Request, res: Response) => {
  const orders = await adminService.getOrders();

  return res.status(200).json({
    success: true,
    data: orders,
  });
});

export const getPendingUsers = asyncHandler(
  async (_req: Request, res: Response) => {
    const users = await adminService.getPendingKyc();

    return res.status(200).json({
      success: true,
      data: users,
    });
  }
);

export const getPendingCompanies = asyncHandler(
  async (_req: Request, res: Response) => {
    const companies = await adminService.getPendingCompanyVerifications();

    return res.status(200).json({
      success: true,
      data: companies,
    });
  }
);

export const approveCompany = asyncHandler(
  async (req: Request, res: Response) => {
    const companyId = req.params.id as string;
    const result = await adminService.approveCompany(companyId);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  }
);

export const rejectCompany = asyncHandler(
  async (req: Request, res: Response) => {
    const companyId = req.params.id as string;
    const result = await adminService.rejectCompany(companyId);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  }
);

export const approveUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.id as string;
  const result = await adminService.verifyUser(userId);

  return res.status(200).json({
    success: true,
    message: result.message,
  });
});

export const rejectUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.id as string;
  const reason = req.body.reason as string | undefined;
  const result = await adminService.rejectUser(userId, reason);

  return res.status(200).json({
    success: true,
    message: result.message,
  });
});

export const blockUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.id as string;
  const result = await adminService.blockUser(userId);

  return res.status(200).json({
    success: true,
    message: result.message,
  });
});

export const unblockUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.id as string;
  const result = await adminService.unblockUser(userId);

  return res.status(200).json({
    success: true,
    message: result.message,
  });
});

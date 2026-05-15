/**
 * Module: Admin.controller
 * Purpose: Implements the Admin.controller module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { Request, Response } from "express";
import asyncHandler from "../../../utils/asyncHandler";
import * as adminService from "../admin.service";
import notificationService from "../../notification/notification.service";
import { NotificationEventType } from "../../notification/notification.types";

/**
 * Get Admin Stats.
 */
export const getAdminStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await adminService.getAdminStats();

  return res.status(200).json({
    success: true,
    data: stats,
  });
});

/**
 * Get Users.
 */
export const getUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await adminService.getUsers();

  return res.status(200).json({
    success: true,
    data: users,
  });
});

/**
 * Get Companies.
 */
export const getCompanies = asyncHandler(async (_req: Request, res: Response) => {
  const companies = await adminService.getCompanies();

  return res.status(200).json({
    success: true,
    data: companies,
  });
});

/**
 * Get Orders.
 */
export const getOrders = asyncHandler(async (_req: Request, res: Response) => {
  const orders = await adminService.getOrders();

  return res.status(200).json({
    success: true,
    data: orders,
  });
});

/**
 * Get Pending Users.
 */
export const getPendingUsers = asyncHandler(
  async (_req: Request, res: Response) => {
    const users = await adminService.getPendingKyc();

    return res.status(200).json({
      success: true,
      data: users,
    });
  }
);

/**
 * Get Pending Companies.
 */
export const getPendingCompanies = asyncHandler(
  async (_req: Request, res: Response) => {
    const companies = await adminService.getPendingCompanyVerifications();

    return res.status(200).json({
      success: true,
      data: companies,
    });
  }
);

/**
 * Approve Company.
 */
export const approveCompany = asyncHandler(
  async (req: Request, res: Response) => {
    const companyId = req.params.id as string;
    const result = await adminService.approveCompany(companyId);

    if (result.notificationPayload) {
      void notificationService.sendNotification(
        NotificationEventType.COMPANY_APPROVED,
        result.notificationPayload
      );
    }

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  }
);

/**
 * Reject Company.
 */
export const rejectCompany = asyncHandler(
  async (req: Request, res: Response) => {
    const companyId = req.params.id as string;
    const result = await adminService.rejectCompany(companyId);

    if (result.notificationPayload) {
      void notificationService.sendNotification(
        NotificationEventType.COMPANY_REJECTED,
        result.notificationPayload
      );
    }

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  }
);

/**
 * Approve User.
 */
export const approveUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.id as string;
  const result = await adminService.verifyUser(userId);
  if (result.notificationPayload) {
    void notificationService.sendNotification(
      NotificationEventType.USER_APPROVED,
      result.notificationPayload,
    );
  }

  return res.status(200).json({
    success: true,
    message: result.message,
  });
});

/**
 * Reject User.
 */
export const rejectUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.id as string;
  const reason = req.body.reason as string | undefined;
  const result = await adminService.rejectUser(userId, reason);
  if (result.notificationPayload) {
    void notificationService.sendNotification(
      NotificationEventType.USER_REJECTED,
      result.notificationPayload,
    );
  }

  return res.status(200).json({
    success: true,
    message: result.message,
  });
});

/**
 * Block User.
 */
export const blockUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.id as string;
  const result = await adminService.blockUser(userId);

  return res.status(200).json({
    success: true,
    message: result.message,
  });
});

/**
 * Unblock User.
 */
export const unblockUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.id as string;
  const result = await adminService.unblockUser(userId);

  return res.status(200).json({
    success: true,
    message: result.message,
  });
});

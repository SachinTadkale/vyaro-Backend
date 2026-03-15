import { Request, Response } from "express";
import * as adminService from "./admin.service";

// Get pending users
export const getPendingUsers = async (
  req: Request,
  res: Response
) => {
  try {
    const users = await adminService.getPendingKyc();

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

// Get pending companies
export const getPendingCompanies = async (
  req: Request,
  res: Response
) => {
  try {
    const companies = await adminService.getPendingCompanyVerifications();

    return res.status(200).json({
      success: true,
      data: companies,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

// Approve company
export const approveCompany = async (
  req: Request,
  res: Response
) => {
  try {
    const companyId = req.params.id as string;

    const result = await adminService.approveCompany(companyId);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Reject company
export const rejectCompany = async (
  req: Request,
  res: Response
) => {
  try {
    const companyId = req.params.id as string;

    const result = await adminService.rejectCompany(companyId);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Approve user
export const approveUser = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.params.id as string;

    const result = await adminService.verifyUser(userId);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Reject user
export const rejectUser = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.params.id as string;
    const reason = req.body.reason as string | undefined;

    const result = await adminService.rejectUser(
      userId,
      reason
    );

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

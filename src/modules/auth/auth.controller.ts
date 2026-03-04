import { Request, Response } from "express";
import * as authService from "./auth.service";

export const registerUser = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await authService.register(req.body);

    return res.status(201).json({
      success: true,
      message: result.message,
      token: result.token,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const loginUser = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await authService.login(req.body);

    return res.status(200).json({
      success: true,
      token: result.token,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const requestOtpController = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await authService.requestOtp(req.body);

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

export const loginWithOtpController = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await authService.loginWithOtp(req.body);

    return res.status(200).json({
      success: true,
      token: result.token,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
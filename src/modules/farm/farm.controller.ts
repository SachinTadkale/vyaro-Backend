import { Request, Response } from "express";
import * as farmService from "./farm.service";

export const addFarm = async (req: any, res: Response) => {
  try {
    const result = await farmService.createFarm(
      req.user.userId,
      req.body
    );

    return res.status(201).json({
      success: true,
      message: result.message,
      data: result.farm,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
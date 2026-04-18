import { Response } from "express";
import asyncHandler from "../../../utils/asyncHandler";
import * as farmService from "../farm.service";

export const addFarm = asyncHandler(async (req: any, res: Response) => {
  const result = await farmService.createFarm(req.user.userId, req.body);

  return res.status(201).json({
    success: true,
    message: result.message,
    data: result.farm,
  });
});

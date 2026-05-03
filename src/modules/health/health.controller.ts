import { Request, Response } from "express";
import prisma from "../../config/prisma";
export const healthCheck = async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res
      .status(200)
      .json({
        success: true,
        message: "Server is healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: "connected",
      });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Server unhealthy",
        error: "Database connection failed",
        timestamp: new Date().toISOString(),
      });
  }
};

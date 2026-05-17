import { Request, Response } from "express";
import prisma from "../../config/prisma";
import { getRedisClient } from "../../config/redis";
import { systemSettingsService } from "../system-settings/v1/system-setting.service";

// Helper to measure high-resolution execution latency in milliseconds
const measureTime = async (fn: () => Promise<any>): Promise<string> => {
  const start = process.hrtime();
  await fn();
  const [seconds, nanoseconds] = process.hrtime(start);
  return (seconds * 1000 + nanoseconds / 1000000).toFixed(2);
};

/**
 * GET /api/v1/health
 * General aggregated status check
 */
export const healthCheck = async (_req: Request, res: Response) => {
  try {
    let dbStatus = "CONNECTED";
    let dbLatency = 0;
    try {
      dbLatency = parseFloat(await measureTime(() => prisma.$queryRaw`SELECT 1`));
    } catch {
      dbStatus = "DISCONNECTED";
    }

    let cacheStatus = "CONNECTED";
    let cacheLatency = 0;
    try {
      const redis = getRedisClient();
      if (!redis) throw new Error();
      const key = `health:test:${Date.now()}`;
      cacheLatency = parseFloat(await measureTime(async () => {
        await redis.set(key, "OK", { ex: 5 });
        await redis.get(key);
      }));
    } catch {
      cacheStatus = "DISCONNECTED";
    }

    const config = await systemSettingsService.getAppConfig();
    const isHealthy = dbStatus === "CONNECTED" && cacheStatus === "CONNECTED";

    return res.status(isHealthy ? 200 : 500).json({
      success: isHealthy,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      services: {
        database: { status: dbStatus, latencyMs: dbLatency },
        cache: { status: cacheStatus, latencyMs: cacheLatency },
        config: { version: config.version, updatedAt: config.updatedAt }
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Server health check critical failure",
      error: error.message
    });
  }
};

/**
 * GET /api/v1/health/db
 * Database direct latency check
 */
export const dbHealth = async (_req: Request, res: Response) => {
  try {
    const latency = await measureTime(() => prisma.$queryRaw`SELECT 1`);
    return res.status(200).json({
      success: true,
      service: "database",
      latencyMs: parseFloat(latency),
      status: "CONNECTED",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      service: "database",
      status: "DISCONNECTED",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * GET /api/v1/health/cache
 * Cache direct latency check
 */
export const cacheHealth = async (_req: Request, res: Response) => {
  try {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error("Redis client is not initialized");
    }

    const key = `health:test:${Date.now()}`;
    const latency = await measureTime(async () => {
      await redis.set(key, "OK", { ex: 5 });
      const val = await redis.get(key);
      if (val !== "OK") throw new Error("Cache read/write verification failed");
    });

    return res.status(200).json({
      success: true,
      service: "cache",
      latencyMs: parseFloat(latency),
      status: "CONNECTED",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      service: "cache",
      status: "DISCONNECTED",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * GET /api/v1/health/config
 * Config cache direct status check
 */
export const configHealth = async (_req: Request, res: Response) => {
  try {
    const config = await systemSettingsService.getAppConfig();
    return res.status(200).json({
      success: true,
      service: "config",
      version: config.version,
      generatedAt: config.generatedAt,
      updatedAt: config.updatedAt,
      maintenanceMode: config.maintenanceMode,
      readOnlyMode: config.readOnlyMode,
      memoryCacheState: "active",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      service: "config",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

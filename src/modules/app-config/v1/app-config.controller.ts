import { Request, Response } from "express";
import { getRedisClient } from "../../../config/redis";
import { systemSettingsService } from "../../system-settings/v1/system-setting.service";
import { logger } from "../../../utils/logger";

/**
 * GET /api/v1/app-config
 *
 * Public remote-configuration endpoint.
 * Serves dynamic system settings, versioning, and feature toggles.
 */
export const getAppConfig = async (req: Request, res: Response) => {
  try {
    const force = req.query.force === "true";

    // Dynamic config endpoints must never be cached by browsers/proxies
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Surrogate-Control", "no-store");

    const config = await systemSettingsService.getAppConfig(force);

    logger.info({
      event: "fetch_config",
      version: config.version,
      updatedAt: config.updatedAt,
      maintenanceMode: config.maintenanceMode,
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      version: config.version,
      updatedAt: config.updatedAt,
      data: {
        maintenanceMode: config.maintenanceMode,
        readOnlyMode: config.readOnlyMode,
        features: config.features,
        ...(config._debug ? { _debug: config._debug } : {})
      },
    });
  } catch (error: any) {
    logger.error({ message: "Critical failure in getAppConfig route handler", error: error.message });
    
    // Safety Fallback (Never break the client UI)
    const fallbackTime = new Date().toISOString();
    
    const fallbackFeatures: Record<string, any> = {};
    try {
      const { FEATURE_REGISTRY } = require("../../system-settings/v1/feature-registry");
      for (const [key, entry] of Object.entries(FEATURE_REGISTRY)) {
        fallbackFeatures[key] = {
          enabled: (entry as any).defaultEnabled,
          visible: (entry as any).defaultVisible,
          maintenance: false,
          platform: (entry as any).platform,
          label: (entry as any).label,
          description: (entry as any).description,
          roles: (entry as any).roles,
          dependsOn: (entry as any).dependsOn,
          routePrefixes: (entry as any).routePrefixes
        };
      }
    } catch {
      fallbackFeatures.marketplace = { enabled: true, visible: true, maintenance: false, platform: "BOTH" };
      fallbackFeatures.orders = { enabled: true, visible: true, maintenance: false, platform: "BOTH" };
    }

    return res.status(200).json({
      success: true,
      version: 1000,
      updatedAt: fallbackTime,
      data: {
        maintenanceMode: false,
        readOnlyMode: false,
        features: fallbackFeatures
      }
    });
  }
};

/**
 * GET /api/v1/admin/runtime-health
 *
 * Exposes health indicators for caches, database latency, and config versions.
 */
export const getRuntimeHealth = async (_req: Request, res: Response) => {
  try {
    const redis = getRedisClient();
    const redisConnected = Boolean(redis);
    
    const config = await systemSettingsService.getAppConfig();

    return res.status(200).json({
      success: true,
      data: {
        snapshotVersion: config.version,
        generatedAt: config.generatedAt,
        updatedAt: config.updatedAt,
        redisConnected,
        memoryCacheState: "active",
        uptimeSeconds: Math.round(process.uptime()),
      }
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

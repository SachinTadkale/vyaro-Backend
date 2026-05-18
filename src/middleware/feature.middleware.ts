import { NextFunction, Request, Response } from "express";
import { FEATURE_REGISTRY } from "../modules/system-settings/v1/feature-registry";
import { systemSettingsService } from "../modules/system-settings/v1/system-setting.service";
import { logger } from "../utils/logger";

function defaultEnabledForKey(settingKey: string): boolean {
  const entry = Object.values(FEATURE_REGISTRY).find((e) => e.enableKey === settingKey);
  return entry?.defaultEnabled ?? true;
}

/**
 * Middleware: featureGuard
 *
 * Module-level (Tier 1) runtime toggle guard.
 * Reads the setting key directly via Redis → DB (never the AppConfig memory snapshot).
 *
 * Usage:
 *   router.use('/marketplace', featureGuard('ENABLE_MARKETPLACE'), marketplaceRoutes);
 */
export const featureGuard = (settingKey: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Owner always bypasses feature guards
    if (req.user?.role === "OWNER") return next();

    const enabled = await systemSettingsService.getBoolean(
      settingKey,
      defaultEnabledForKey(settingKey)
    );

    if (process.env.NODE_ENV === "development") {
      const [dbRecord, redisValue, settingsVersion] = await Promise.all([
        systemSettingsService.getByKey(settingKey),
        systemSettingsService.getSettingCacheValue(settingKey),
        systemSettingsService.getSettingsVersion(),
      ]);

      logger.info({
        event: "feature_guard_check",
        settingKey,
        enabled,
        dbValue: dbRecord?.value ?? null,
        redisValue,
        settingsVersion,
        userId: req.user?.userId,
        role: req.user?.role,
      });
    }

    if (!enabled) {
      return res.status(503).json({
        success: false,
        code:    "FEATURE_DISABLED",
        message: `This feature is currently unavailable. (${settingKey})`,
      });
    }
    next();
  };
};

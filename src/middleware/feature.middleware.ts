import { NextFunction, Request, Response } from "express";
import { systemSettingsService } from "../modules/system-settings/v1/system-setting.service";

/**
 * Middleware: featureGuard
 *
 * Module-level (Tier 1) runtime toggle guard.
 * Checks a SystemSetting boolean key — Redis-backed, sub-millisecond.
 *
 * Usage:
 *   router.use('/marketplace', featureGuard('ENABLE_MARKETPLACE'), marketplaceRoutes);
 */
export const featureGuard = (settingKey: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Owner always bypasses feature guards
    if (req.user?.role === "OWNER") return next();

    const enabled = await systemSettingsService.getBoolean(settingKey, true);
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

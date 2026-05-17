import { NextFunction, Request, Response } from "express";
import { systemSettingsService } from "../modules/system-settings/v1/system-setting.service";

const settingToFeatureKeyMap: Record<string, string> = {
  ENABLE_MARKETPLACE: "marketplace",
  ENABLE_ORDERS: "orders",
  ENABLE_PAYMENTS: "payments",
  ENABLE_DELIVERY: "delivery",
  ENABLE_MARKET_RATES: "marketRates",
  ENABLE_AI: "ai",
  ENABLE_NEWS: "news",
  ENABLE_QR: "qr",
  ENABLE_MY_CROPS: "myCrops",
};

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

    const config = await systemSettingsService.getAppConfig();
    const featureKey = settingToFeatureKeyMap[settingKey];
    
    let enabled = true;
    if (featureKey) {
      enabled = (config.features as any)[featureKey]?.enabled ?? true;
    } else {
      enabled = await systemSettingsService.getBoolean(settingKey, true);
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

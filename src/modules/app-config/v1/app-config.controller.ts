import { Request, Response } from "express";
import { getRedisClient } from "../../../config/redis";
import { systemSettingsService } from "../../system-settings/v1/system-setting.service";
import {
  APPCONFIG_CACHE_KEY,
  APPCONFIG_CACHE_TTL,
  SystemSettingKey,
} from "../../system-settings/v1/system-setting.types";

/** Shape of the /app-config response */
interface FeatureConfig {
  enabled: boolean;
  visible: boolean;
}

interface AppConfigResponse {
  maintenanceMode: boolean;
  readOnlyMode:    boolean;
  features: {
    marketplace:  FeatureConfig;
    orders:       FeatureConfig;
    payments:     FeatureConfig;
    delivery:     FeatureConfig;
    marketRates:  FeatureConfig;
    ai:           FeatureConfig;
    news:         FeatureConfig;
    qr:           FeatureConfig;
  };
  _cachedAt: string;
}

/**
 * GET /api/v1/app-config
 *
 * Public endpoint — no authentication required.
 * Returns the current feature flag + UI visibility state for all modules.
 *
 * Response is cached in Redis for 5 minutes (APPCONFIG_CACHE_TTL).
 * Cache is invalidated immediately whenever any SystemSetting is updated.
 */
export const getAppConfig = async (_req: Request, res: Response) => {
  try {
    // ── Redis cache read ──────────────────────────────────────────────────────
    const redis = getRedisClient();
    if (redis) {
      const cached = await redis.get(APPCONFIG_CACHE_KEY).catch(() => null);
      if (cached) {
        const parsed = JSON.parse(cached) as AppConfigResponse;
        return res.json({ success: true, data: parsed, _source: "cache" });
      }
    }

    // ── Build config from SystemSetting ──────────────────────────────────────
    const [
      maintenanceMode,
      readOnlyMode,

      enableMarketplace, visibleMarketplace,
      enableOrders,      visibleOrders,
      enablePayments,
      enableDelivery,    visibleDelivery,
      enableMarketRates, visibleMarketRates,
      enableAI,          visibleAI,
      enableNews,        visibleNews,
      enableQR,          visibleQR,
      enableMyCrops,     visibleMyCrops,
    ] = await Promise.all([
      systemSettingsService.getBoolean(SystemSettingKey.MAINTENANCE_MODE, false),
      systemSettingsService.getBoolean(SystemSettingKey.READ_ONLY_MODE,   false),

      systemSettingsService.getBoolean(SystemSettingKey.ENABLE_MARKETPLACE,   true),
      systemSettingsService.getBoolean(SystemSettingKey.VISIBLE_MARKETPLACE,  true),
      systemSettingsService.getBoolean(SystemSettingKey.ENABLE_ORDERS,        true),
      systemSettingsService.getBoolean(SystemSettingKey.VISIBLE_ORDERS,       true),
      systemSettingsService.getBoolean(SystemSettingKey.ENABLE_PAYMENTS,      true),
      systemSettingsService.getBoolean(SystemSettingKey.ENABLE_DELIVERY,      true),
      systemSettingsService.getBoolean(SystemSettingKey.VISIBLE_DELIVERY,     true),
      systemSettingsService.getBoolean(SystemSettingKey.ENABLE_MARKET_RATES,  true),
      systemSettingsService.getBoolean(SystemSettingKey.VISIBLE_MARKET_RATES, true),
      systemSettingsService.getBoolean(SystemSettingKey.ENABLE_AI,            false),
      systemSettingsService.getBoolean(SystemSettingKey.VISIBLE_AI,           true),
      systemSettingsService.getBoolean(SystemSettingKey.ENABLE_NEWS,          false),
      systemSettingsService.getBoolean(SystemSettingKey.VISIBLE_NEWS,         true),
      systemSettingsService.getBoolean(SystemSettingKey.ENABLE_QR,            false),
      systemSettingsService.getBoolean(SystemSettingKey.VISIBLE_QR,           false),
      systemSettingsService.getBoolean(SystemSettingKey.ENABLE_MY_CROPS,       true),
      systemSettingsService.getBoolean(SystemSettingKey.VISIBLE_MY_CROPS,      true),
    ]);

    const config: AppConfigResponse = {
      maintenanceMode,
      readOnlyMode,
      features: {
        marketplace: { enabled: enableMarketplace, visible: visibleMarketplace },
        orders:      { enabled: enableOrders,      visible: visibleOrders      },
        payments:    { enabled: enablePayments,    visible: true               },
        delivery:    { enabled: enableDelivery,    visible: visibleDelivery    },
        marketRates: { enabled: enableMarketRates, visible: visibleMarketRates },
        ai:          { enabled: enableAI,          visible: visibleAI          },
        news:        { enabled: enableNews,        visible: visibleNews        },
        qr:          { enabled: enableQR,          visible: visibleQR          },
        myCrops:     { enabled: enableMyCrops,     visible: visibleMyCrops     },
      },
      _cachedAt: new Date().toISOString(),
    };

    // ── Cache the built config ────────────────────────────────────────────────
    if (redis) {
      await redis
        .set(APPCONFIG_CACHE_KEY, JSON.stringify(config), { ex: APPCONFIG_CACHE_TTL })
        .catch(() => {});
    }

    res.json({ success: true, data: config, _source: "db" });
  } catch (e: any) {
    // Return safe fallback on error — never crash the app
    res.status(200).json({
      success: true,
      data:    buildFallbackConfig(),
      _source: "fallback",
    });
  }
};

/** Safe defaults used when /app-config itself fails */
function buildFallbackConfig(): AppConfigResponse {
  return {
    maintenanceMode: false,
    readOnlyMode:    false,
    features: {
      marketplace: { enabled: true,  visible: true  },
      orders:      { enabled: true,  visible: true  },
      payments:    { enabled: true,  visible: true  },
      delivery:    { enabled: true,  visible: true  },
      marketRates: { enabled: true,  visible: true  },
      ai:          { enabled: false, visible: true  },
      news:        { enabled: false, visible: true  },
      qr:          { enabled: false, visible: false },
      myCrops:     { enabled: true,  visible: true  },
    },
    _cachedAt: new Date().toISOString(),
  };
}

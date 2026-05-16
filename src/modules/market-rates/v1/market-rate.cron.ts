import cron from "node-cron";
import { MarketRateService } from "./market-rate.service";
import { systemSettingsService } from "../../../modules/system-settings/v1/system-setting.service";
import { SystemSettingKey } from "../../../modules/system-settings/v1/system-setting.types";
import { logger } from "../../../utils/logger";

const service = new MarketRateService();

/**
 * Market Rates Sync Cron — runs daily at 6:00 AM IST.
 * Respects environment-aware toggles and database runtime controls.
 */
export const initMarketRatesCron = () => {
  const isProd = process.env.NODE_ENV === "production";
  const envCronEnabled = process.env.ENABLE_MARKET_SYNC_CRON
    ? process.env.ENABLE_MARKET_SYNC_CRON === "true"
    : isProd; // Disabled in Dev by default, Enabled in Prod

  if (!envCronEnabled) {
    logger.info({
      message: "⏸️  Market Rates Cron registration skipped (disabled by environment config)."
    });
    return;
  }

  logger.info({
    message: "⏰ Market Rates Cron registered and active (Daily at 6:00 AM, runtime-controlled)."
  });

  cron.schedule("0 6 * * *", async () => {
    try {
      // 1. Check Runtime database toggle
      const enabled = await systemSettingsService.getBoolean(
        SystemSettingKey.ENABLE_MARKET_RATE_CRON,
        true
      );

      if (!enabled) {
        logger.info({ message: "⏸️  Market rate sync skipped — ENABLE_MARKET_RATE_CRON is OFF." });
        return;
      }

      logger.info({ message: "🚀 Running scheduled Daily Market Rates Sync..." });
      await service.syncMarketRates();
    } catch (err: any) {
      logger.error({ message: "Failed executing scheduled Market Rates Sync cron", error: err.message });
    }
  });
};

import cron from "node-cron";
import { MarketRateService } from "./market-rate.service";
import { systemSettingsService } from "../../../modules/system-settings/v1/system-setting.service";
import { SystemSettingKey } from "../../../modules/system-settings/v1/system-setting.types";

const service = new MarketRateService();

/**
 * Market Rates Sync Cron — runs daily at 6:00 AM.
 * Checks ENABLE_MARKET_RATE_CRON before executing.
 * Can be toggled live via system settings without restart.
 */
export const initMarketRatesCron = () => {
  console.log("⏰ Market Rates Cron initialized (Daily at 6:00 AM, runtime-controlled).");

  // Trigger an immediate sync on startup
  service.syncMarketRates();

  cron.schedule("0 6 * * *", async () => {
    const enabled = await systemSettingsService.getBoolean(
      SystemSettingKey.ENABLE_MARKET_RATE_CRON,
      true
    );

    if (!enabled) {
      console.log("⏸️  Market rate sync skipped — ENABLE_MARKET_RATE_CRON is OFF.");
      return;
    }

    console.log("🚀 Running scheduled Market Rates Sync...");
    await service.syncMarketRates();
  });
};

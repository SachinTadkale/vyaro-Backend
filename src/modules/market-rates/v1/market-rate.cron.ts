import cron from "node-cron";
import { MarketRateService } from "./market-rate.service";

const service = new MarketRateService();

/**
 * Scheduled Market Rates Sync
 * Runs every day at 6:00 AM
 */
export const initMarketRatesCron = () => {
  console.log("⏰ Market Rates Cron Initialized (Daily at 6:00 AM)");
  
  // Trigger immediate sync on startup to ensure data is available
  console.log("🔄 Triggering Initial Market Rates Sync...");
  service.syncMarketRates();

  // 0 6 * * * = 6:00 AM every day
  cron.schedule("0 6 * * *", async () => {
    console.log("🚀 Running Scheduled Market Rates Sync...");
    await service.syncMarketRates();
  });
};

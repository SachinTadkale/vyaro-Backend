import cron from "node-cron";
import { systemSettingsService } from "../modules/system-settings/v1/system-setting.service";
import { SystemSettingKey } from "../modules/system-settings/v1/system-setting.types";
import prisma from "../config/prisma";
import { DeliveryStatus } from "@prisma/client";

const expireDeliveries = async () => {
  await prisma.delivery.updateMany({
    where: {
      status:             DeliveryStatus.PENDING_ASSIGNMENT,
      assignmentStatus:   "OPEN",
      assignmentExpiresAt: { lt: new Date() },
    },
    data: { assignmentStatus: "EXPIRED" },
  });
  console.log("🚚 Delivery expiry cron: stale assignments expired.");
};

/**
 * Delivery Cron — runs every 30 minutes.
 * Only executes if ENABLE_DELIVERY_CRON is true in SystemSettings.
 * Handles stale delivery assignment cleanup (retry/recovery task).
 */
export const initDeliveryCron = () => {
  cron.schedule("*/30 * * * *", async () => {
    const enabled = await systemSettingsService.getBoolean(
      SystemSettingKey.ENABLE_DELIVERY_CRON,
      true
    );

    if (!enabled) {
      console.log("⏸️  Delivery cron skipped — ENABLE_DELIVERY_CRON is OFF.");
      return;
    }

    console.log("🔄 Running delivery expiry cron...");
    await expireDeliveries();
  });

  console.log("⏰ Delivery Cron initialized (every 30 minutes, runtime-controlled).");
};
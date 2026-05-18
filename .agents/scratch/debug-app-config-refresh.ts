import prisma from "../../src/config/prisma";
import { FEATURE_REGISTRY } from "../../src/modules/system-settings/v1/feature-registry";
import { SystemSettingRepository } from "../../src/modules/system-settings/v1/system-setting.repository";
import {
  AppConfigResponseSchema,
  systemSettingsService,
} from "../../src/modules/system-settings/v1/system-setting.service";
import { SystemSettingKey } from "../../src/modules/system-settings/v1/system-setting.types";

const settingRepo = new SystemSettingRepository();

async function main() {
  const maintenanceMode = await systemSettingsService.getBoolean(
    SystemSettingKey.MAINTENANCE_MODE,
    false
  );
  const readOnlyMode = await systemSettingsService.getBoolean(
    SystemSettingKey.READ_ONLY_MODE,
    false
  );

  const registryEntries = Object.entries(FEATURE_REGISTRY);
  const featureStates = await Promise.all(
    registryEntries.map(async ([key, entry]) => {
      const enabled = await systemSettingsService.getBoolean(
        entry.enableKey,
        entry.defaultEnabled
      );
      const visible = await systemSettingsService.getBoolean(
        entry.visibleKey,
        entry.defaultVisible
      );
      if (key === "ai") {
        const redisVal = await systemSettingsService.getSettingCacheValue(entry.enableKey);
        console.log("[REFRESH DEBUG] ai state:", {
          enableKey: entry.enableKey,
          enabled,
          visible,
          redisVal,
          dbDirect: (await settingRepo.findByKey(entry.enableKey))?.value,
        });
      }
      return { key, enabled, visible, entry };
    })
  );

  const features: Record<string, unknown> = {};
  for (const state of featureStates) {
    features[state.key] = {
      enabled: state.enabled,
      visible: state.visible,
      maintenance: maintenanceMode,
      platform: state.entry.platform,
    };
  }

  const rawConfig = {
    version: Date.now(),
    generatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    maintenanceMode,
    readOnlyMode,
    features,
  };

  try {
    const validated = AppConfigResponseSchema.parse(rawConfig);
    console.log("[REFRESH DEBUG] Zod OK, ai:", validated.features.ai);
  } catch (err: any) {
    console.log("[REFRESH DEBUG] Zod FAILED:", err?.issues?.slice(0, 3) ?? err.message);
  }

  const config = await systemSettingsService.getAppConfig(true);
  console.log("[REFRESH DEBUG] getAppConfig ai:", config.features.ai);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

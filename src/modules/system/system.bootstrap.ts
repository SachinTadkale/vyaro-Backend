import prisma from "../../config/prisma";
import { DEFAULT_SETTINGS, DEFAULT_ROUTE_TOGGLES } from "../system-settings/v1/system-setting.types";
import { systemSettingsService } from "../system-settings/v1/system-setting.service";
import { CreatedSource } from "@prisma/client";

export const SYSTEM_REGISTRY_VERSION = 1;

async function initializeSystemSettings() {
  let createdCount = 0;
  for (const setting of DEFAULT_SETTINGS) {
    const existing = await prisma.systemSetting.findUnique({
      where: { key: setting.key },
    });

    if (!existing) {
      await prisma.systemSetting.create({
        data: {
          key: setting.key,
          value: setting.value,
          displayName: setting.displayName,
          description: setting.description,
          category: setting.category,

          groupKey: setting.groupKey,
          isCritical: setting.isCritical,
          isSeededBySystem: true,
          createdSource: CreatedSource.SYSTEM_BOOTSTRAP,
        },
      });
      createdCount++;
    }
  }
  if (createdCount > 0) {
    console.log(`✅ SystemSettings: bootstrapped ${createdCount} new defaults.`);
  }
}

async function initializeRouteToggles() {
  let createdCount = 0;
  for (const route of DEFAULT_ROUTE_TOGGLES) {
    const method = route.method.toUpperCase();
    const path = route.path.toLowerCase().replace(/\/+$/, "");

    const existing = await prisma.routeToggle.findUnique({
      where: { method_path: { method, path } },
    });

    if (!existing) {
      await prisma.routeToggle.create({
        data: {
          method,
          path,
          enabled: route.enabled,
          displayName: route.displayName,
          description: route.description,
          groupKey: route.groupKey,
          moduleKey: route.moduleKey,
          isCritical: route.isCritical,
          isSeededBySystem: true,
          createdSource: CreatedSource.SYSTEM_BOOTSTRAP,
        },
      });
      createdCount++;
    }
  }
  if (createdCount > 0) {
    console.log(`✅ RouteToggles: bootstrapped ${createdCount} new defaults.`);
  }
}

export async function bootstrapRuntimeControls() {
  console.log(`🚀 Starting Runtime Control Bootstrap (Registry v${SYSTEM_REGISTRY_VERSION})`);
  
  try {
    await initializeSystemSettings();
    await initializeRouteToggles();
    
    // Sync Redis
    await systemSettingsService.refreshSettingsCache();
    console.log(`✅ Runtime Controls Bootstrapped & Redis Synced successfully.`);
  } catch (error) {
    console.error("❌ Failed to bootstrap runtime controls:", error);
    throw error;
  }
}

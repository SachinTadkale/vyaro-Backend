import prisma from "../../src/config/prisma";
import { getRedisClient } from "../../src/config/redis";
import { systemSettingsService } from "../../src/modules/system-settings/v1/system-setting.service";

async function main() {
  const db = await prisma.systemSetting.findUnique({ where: { key: "ENABLE_AI" } });
  console.log("[AI DEBUG] DB ENABLE_AI:", db?.value);

  const redis = getRedisClient();
  if (redis) {
    const perKey = await redis.get("SYSSET:ENABLE_AI");
    const snapRaw = await redis.get("SYSTEM_SETTINGS:SNAPSHOT:v1");
    let snap = snapRaw;
    if (typeof snapRaw === "string") snap = JSON.parse(snapRaw);
    const snapAi = Array.isArray(snap)
      ? (snap as { key: string; value: string }[]).find((s) => s.key === "ENABLE_AI")
      : null;
    console.log("[AI DEBUG] Redis SYSSET:ENABLE_AI:", perKey);
    console.log("[AI DEBUG] Redis SNAPSHOT ENABLE_AI:", snapAi?.value);
  }

  const byKey = await systemSettingsService.getByKey("ENABLE_AI");
  console.log("[AI DEBUG] getByKey ENABLE_AI:", byKey?.value);

  const bool = await systemSettingsService.getBoolean("ENABLE_AI", false);
  console.log("[AI DEBUG] getBoolean ENABLE_AI:", bool);

  const { FEATURE_REGISTRY } = await import("../../src/modules/system-settings/v1/feature-registry");
  const aiEntry = FEATURE_REGISTRY.ai;
  const parallelEnabled = await systemSettingsService.getBoolean(
    aiEntry.enableKey,
    aiEntry.defaultEnabled
  );
  console.log("[AI DEBUG] parallel-style getBoolean:", parallelEnabled);

  const config = await systemSettingsService.getAppConfig(true);
  console.log("[AI DEBUG] getAppConfig features.ai:", config.features.ai);

  const version = await systemSettingsService.getSettingsVersion();
  console.log("[AI DEBUG] SETTINGS VERSION:", version);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

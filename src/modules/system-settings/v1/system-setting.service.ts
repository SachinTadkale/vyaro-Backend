import { getRedisClient } from "../../../config/redis";
import {
  APPCONFIG_CACHE_KEY,
  CACHE_PREFIX_ROUTE,
  CACHE_PREFIX_SETTING,
  CACHE_TTL_SECONDS,
  SystemSettingKey,
} from "./system-setting.types";
import { logger } from "../../../utils/logger";
import {
  RouteToggleRepository,
  SystemSettingRepository,
} from "./system-setting.repository";
import { z } from "zod";
import { FEATURE_REGISTRY, FeatureRegistryEntry } from "./feature-registry";
import prisma from "../../../config/prisma";
import { systemSettingEventService } from "./system-setting-event.service";

const settingRepo = new SystemSettingRepository();
const routeRepo   = new RouteToggleRepository();

// ── Zod Validation Schemas for Type-safety ───────────────────────────────────

const FeatureConfigSchema = z.object({
  enabled: z.boolean(),
  visible: z.boolean(),
  maintenance: z.boolean(),
  platform: z.enum(["BOTH", "APP", "WEB", "ADMIN"]),
  label: z.string().optional(),
  description: z.string().optional(),
  roles: z.array(z.string()).optional(),
  dependsOn: z.array(z.string()).optional(),
  routePrefixes: z.array(z.string()).optional()
});

export const AppConfigResponseSchema = z.object({
  version: z.number(),
  generatedAt: z.string(),
  updatedAt: z.string(),
  maintenanceMode: z.boolean(),
  readOnlyMode: z.boolean(),
  features: z.record(z.string(), FeatureConfigSchema),
  _debug: z.object({
    registryKeysCount: z.number(),
    activeFeaturesCount: z.number(),
    cacheWarmedAt: z.string(),
    dbStatus: z.string(),
    latencies: z.object({
      appConfigRefreshMs: z.number()
    })
  }).optional()
});

export type FeatureConfigType = z.infer<typeof FeatureConfigSchema>;
export type AppConfigResponse = z.infer<typeof AppConfigResponseSchema>;

export class SystemSettingService {
  private onChangeCallbacks: (() => Promise<void>)[] = [];

  // Memory Caches for individual tables
  private localSystemSettingsCache: any = null;
  private localSystemSettingsExpiresAt = 0;

  private localRouteToggleCache: any = null;
  private localRouteToggleExpiresAt = 0;

  private localAuditCache: any = null;
  private localAuditExpiresAt = 0;

  // Centralized AppConfig memory cache (30-second TTL)
  private appConfigCache: AppConfigResponse | null = null;
  private appConfigExpiresAt = 0;
  private appConfigUpdatedAt = new Date().toISOString();
  private isRefreshingAppConfig = false;
  private appConfigRefreshGeneration = 0;
  private readonly APP_CONFIG_TTL = 30 * 1000; // 30 seconds max TTL

  // Rebuilding states (local single-flight locks)
  private isRebuildingSettings = false;
  private isRebuildingRoutes = false;
  private isRebuildingAudits = false;

  // Debouncing timeouts
  private settingsRebuildTimeout: NodeJS.Timeout | null = null;
  private routesRebuildTimeout: NodeJS.Timeout | null = null;
  private auditsRebuildTimeout: NodeJS.Timeout | null = null;

  // Realtime redseign variables
  private settingsVersion = 1;
  private localCooldowns = new Map<string, number>();
  private pendingBroadcastKeys = new Set<string>();
  private socketBroadcastTimeout: NodeJS.Timeout | null = null;

  private readonly COOLDOWN_DURATION_SEC = 15;
  private readonly CRITICAL_KEYS = ["ENABLE_AI", "ENABLE_PAYMENTS", "ENABLE_MARKETPLACE", "MAINTENANCE_MODE"];

  registerOnChange(callback: () => Promise<void>) {
    this.onChangeCallbacks.push(callback);
  }

  // ─── Versioning & Synchronized State ────────────────────────────────────────

  async getSettingsVersion(): Promise<number> {
    const redis = getRedisClient();
    if (redis) {
      const ver = await redis.get("SYSTEM_SETTINGS:VERSION").catch(() => null);
      if (ver) {
        this.settingsVersion = parseInt(String(ver)) || 1;
        return this.settingsVersion;
      }
    }
    return this.settingsVersion;
  }

  async incrementSettingsVersion(): Promise<number> {
    const redis = getRedisClient();
    if (redis) {
      try {
        const nextVer = await redis.incr("SYSTEM_SETTINGS:VERSION").catch(() => null);
        if (nextVer) {
          this.settingsVersion = Number(nextVer);
          logger.info({
            event: "settings_version_incremented",
            version: this.settingsVersion,
            storage: "REDIS"
          });
          return this.settingsVersion;
        }
      } catch (err: any) {
        logger.error({
          message: "Failed to increment settings version in Redis",
          error: err.message
        });
      }
    }
    this.settingsVersion += 1;
    logger.info({
      event: "settings_version_incremented",
      version: this.settingsVersion,
      storage: "MEMORY"
    });
    return this.settingsVersion;
  }

  // ─── Cooldown Management (Redis-backed) ────────────────────────────────────

  async checkAndSetCooldown(key: string, triggeredById: string | null = null): Promise<void> {
    if (!this.CRITICAL_KEYS.includes(key)) return;

    const redis = getRedisClient();
    const redisKey = `SYSTEM_SETTINGS:COOLDOWN:${key}`;

    if (redis) {
      const exists = await redis.get(redisKey).catch(() => null);
      if (exists) {
        logger.warn({
          event: "cooldown_blocked",
          key,
          storage: "REDIS"
        });
        const currentVersion = await this.getSettingsVersion();
        const ttl = await redis.ttl(redisKey).catch(() => 15);
        await systemSettingEventService.logCooldownBlocked({
          settingKey: key,
          remainingCooldownSecs: ttl > 0 ? ttl : 15,
          triggeredById,
          settingsVersion: currentVersion,
        });
        throw new Error(`Cooldown active: Please wait 15 seconds before toggling ${key} again.`);
      }
      await redis.set(redisKey, "locked", { ex: this.COOLDOWN_DURATION_SEC }).catch(() => {});
      logger.info({
        event: "cooldown_set",
        key,
        storage: "REDIS"
      });
      return;
    }

    // Memory Fallback
    const now = Date.now();
    const lastChanged = this.localCooldowns.get(key) || 0;
    if (now - lastChanged < this.COOLDOWN_DURATION_SEC * 1000) {
      const remaining = Math.ceil((this.COOLDOWN_DURATION_SEC * 1000 - (now - lastChanged)) / 1000);
      logger.warn({
        event: "cooldown_blocked",
        key,
        remainingSeconds: remaining,
        storage: "MEMORY"
      });
      const currentVersion = await this.getSettingsVersion();
      await systemSettingEventService.logCooldownBlocked({
        settingKey: key,
        remainingCooldownSecs: remaining,
        triggeredById,
        settingsVersion: currentVersion,
      });
      throw new Error(`Cooldown active: Please wait ${remaining} seconds before toggling ${key} again.`);
    }
    this.localCooldowns.set(key, now);
    logger.info({
      event: "cooldown_set",
      key,
      storage: "MEMORY"
    });
  }

  // ─── Value Validation (Typed checks) ───────────────────────────────────────

  validateSettingValue(key: string, value: string, type: string) {
    logger.info({
      event: "validate_setting_value_start",
      key,
      value,
      type
    });

    if (type === "BOOLEAN") {
      if (value !== "true" && value !== "false") {
        throw new Error(`Validation failed for setting '${key}': Value must be 'true' or 'false'.`);
      }
    } else if (type === "NUMBER") {
      if (isNaN(Number(value))) {
        throw new Error(`Validation failed for setting '${key}': Value must be a valid number.`);
      }
    } else if (type === "JSON") {
      try {
        JSON.parse(value);
      } catch (err) {
        throw new Error(`Validation failed for setting '${key}': Value must be valid JSON.`);
      }
    }

    logger.info({
      event: "validate_setting_value_success",
      key,
      value
    });
  }

  // ─── Cache Hydration (Pre-warming) ──────────────────────────────────────────

  async hydrateCacheOnStartup(): Promise<void> {
    logger.info("⚡ Starting system settings cache hydration (pre-warming)...");
    try {
      // Warm settings version
      await this.getSettingsVersion();

      // Preload critical setting values into Redis
      for (const key of this.CRITICAL_KEYS) {
        const record = await settingRepo.findByKey(key);
        if (record) {
          await this.setSettingCache(key, record.value);
        }
      }

      // Rebuild and seed caches
      await this.rebuildSystemSettingsCache();
      await this.rebuildRouteToggleCache();
      await this.getAppConfig(true);

      logger.info("⚡ System settings cache hydration completed successfully.");
    } catch (err: any) {
      logger.error({
        message: "Failed to hydrate settings cache on startup",
        error: err.message
      });
    }
  }

  // ─── Realtime Change Emitter ───────────────────────────────────────────────

  async triggerChange(changedKeys: string[] = []) {
    // Increment the config updatedAt timestamp synchronously on any write
    this.appConfigUpdatedAt = new Date().toISOString();

    // Immediately evict memory cache
    this.invalidateAppConfigCache();

    // Increment settings version immediately upon DB write success (Refinement #3)
    const newVersion = await this.incrementSettingsVersion();

    // Accumulate unique updated keys for debounced emission (Refinement #5)
    for (const key of changedKeys) {
      if (this.CRITICAL_KEYS.includes(key)) {
        this.pendingBroadcastKeys.add(key);
      }
    }

    // Execute registered callbacks
    for (const callback of this.onChangeCallbacks) {
      try {
        await callback();
      } catch (err: any) {
        logger.error({
          message: "Error executing App Config onChange callback",
          error: err.message
        });
      }
    }

    // Schedule debounced Socket.IO broadcast (Refinement #5)
    if (this.socketBroadcastTimeout) clearTimeout(this.socketBroadcastTimeout);

    this.socketBroadcastTimeout = setTimeout(() => {
      const keysToEmit = Array.from(this.pendingBroadcastKeys);
      this.pendingBroadcastKeys.clear();

      if (keysToEmit.length > 0) {
        logger.info({
          event: "socket_debounce_expired_emitting",
          version: newVersion,
          keys: keysToEmit
        });

        try {
          const { emitSystemSettingsUpdated } = require("../../../config/socket");
          emitSystemSettingsUpdated({
            version: newVersion,
            updatedKeys: keysToEmit
          });
        } catch (socketErr: any) {
          logger.error({
            message: "Failed to broadcast settings update via Socket.IO",
            error: socketErr.message
          });
        }
      }
    }, 3000); // 3-second debounce window (Refinement #5)
  }

  // ─── AppConfig Centralized Loading ──────────────────────────────────────────

  /**
   * Retrieves the centralized dynamic configuration.
   * Leverages a local 30-second memory TTL to avoid duplicate database loads.
   */
  async getAppConfig(force = false): Promise<AppConfigResponse> {
    const now = Date.now();
    if (!force && this.appConfigCache && now < this.appConfigExpiresAt) {
      return this.appConfigCache;
    }

    return this.refreshAppConfig();
  }

  /**
   * Auto-heals and seeds the feature registry in the database on startup.
   * Scans all features in FEATURE_REGISTRY, verifies their DB presence,
   * and seeds missing ones with defaults. Obsolete settings are NEVER deleted.
   */
  async initializeFeatureRegistry(): Promise<void> {
    try {
      logger.info("Initializing system feature registry seeder...");
      const dbSettings = await settingRepo.findAll();
      const dbKeys = new Set(dbSettings.map(s => s.key));

      // Loop through all feature definitions in the registry
      for (const [key, entry] of Object.entries(FEATURE_REGISTRY)) {
        // 1. Check & Seed Enable Toggle
        if (!dbKeys.has(entry.enableKey)) {
          logger.info(`Seeding missing ENABLE toggle: ${entry.enableKey}`);
          await settingRepo.upsertByKey({
            key: entry.enableKey,
            value: entry.defaultEnabled ? "true" : "false",
            displayName: entry.label,
            description: entry.description,
            category: "FEATURE",
            groupKey: "FEATURE",
            isCritical: key === "marketplace" || key === "orders" || key === "myCrops"
          });
        }

        // 2. Check & Seed Visible Toggle
        if (!dbKeys.has(entry.visibleKey)) {
          logger.info(`Seeding missing VISIBLE toggle: ${entry.visibleKey}`);
          await settingRepo.upsertByKey({
            key: entry.visibleKey,
            value: entry.defaultVisible ? "true" : "false",
            displayName: `Show ${entry.label} in UI`,
            description: `Show/hide ${entry.label} in navigation and home screen`,
            category: "FEATURE",
            groupKey: "UI_VISIBILITY",
            isCritical: false
          });
        }
      }

      logger.info("Feature registry initialized successfully.");
    } catch (err: any) {
      logger.error({
        message: "Failed to initialize and seed feature registry",
        error: err.message
      });
    }
  }

  /**
   * Recomputes and updates the AppConfig cache with dynamic values and Zod validation.
   */
  async refreshAppConfig(): Promise<AppConfigResponse> {
    if (this.isRefreshingAppConfig && this.appConfigCache) {
      return this.appConfigCache; // Prevent duplicate concurrent rebuilds
    }

    const refreshGeneration = this.appConfigRefreshGeneration;
    this.isRefreshingAppConfig = true;
    const redis = getRedisClient();

    try {
      const now = Date.now();

      // Read maintenance and read-only mode states
      const [maintenanceMode, readOnlyMode] = await Promise.all([
        this.getBoolean(SystemSettingKey.MAINTENANCE_MODE, false),
        this.getBoolean(SystemSettingKey.READ_ONLY_MODE, false),
      ]);

      // Dynamically load feature configs from DB/Redis settings according to FEATURE_REGISTRY
      const features: Record<string, any> = {};
      
      const registryEntries = Object.entries(FEATURE_REGISTRY);
      const featureStates = await Promise.all(
        registryEntries.map(async ([key, entry]) => {
          const enabled = await this.getBoolean(entry.enableKey, entry.defaultEnabled);
          const visible = await this.getBoolean(entry.visibleKey, entry.defaultVisible);
          return {
            key,
            enabled,
            visible,
            platform: entry.platform,
            label: entry.label,
            description: entry.description,
            roles: entry.roles,
            dependsOn: entry.dependsOn,
            routePrefixes: entry.routePrefixes
          };
        })
      );

      for (const state of featureStates) {
        features[state.key] = {
          enabled: state.enabled,
          visible: state.visible,
          maintenance: maintenanceMode,
          platform: state.platform,
          label: state.label,
          description: state.description,
          roles: state.roles,
          dependsOn: state.dependsOn,
          routePrefixes: state.routePrefixes
        };
      }

      // Get the absolute maximum updatedAt from the database settings/route tables for absolute data synchronization
      const [latestSetting, latestRoute] = await Promise.all([
        prisma.systemSetting.findFirst({
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true }
        }).catch(() => null),
        prisma.routeToggle.findFirst({
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true }
        }).catch(() => null)
      ]);

      let maxDbDate = new Date(0);
      if (latestSetting?.updatedAt) {
        maxDbDate = new Date(latestSetting.updatedAt);
      }
      if (latestRoute?.updatedAt) {
        const d = new Date(latestRoute.updatedAt);
        if (d > maxDbDate) maxDbDate = d;
      }

      const finalUpdatedAt = maxDbDate.getTime() > 0 
        ? maxDbDate.toISOString() 
        : this.appConfigUpdatedAt;

      const generatedAt = new Date().toISOString();
      // Enforce 100% deterministic timestamp-based version representing database state
      const version = new Date(finalUpdatedAt).getTime();

      const rawConfig = {
        version,
        generatedAt,
        updatedAt: finalUpdatedAt,
        maintenanceMode,
        readOnlyMode,
        features
      };

      // Add debug metadata in development environments
      if (process.env.NODE_ENV === "development") {
        (rawConfig as any)._debug = {
          registryKeysCount: registryEntries.length,
          activeFeaturesCount: Object.values(features).filter(f => f.enabled).length,
          cacheWarmedAt: generatedAt,
          dbStatus: "CONNECTED",
          latencies: {
            appConfigRefreshMs: Date.now() - now
          }
        };
      }

      // Perform strict Zod schema validation to verify shape integrity
      const validatedConfig = AppConfigResponseSchema.parse(rawConfig);

      // Discard stale in-flight refreshes invalidated while this rebuild was running
      if (refreshGeneration !== this.appConfigRefreshGeneration) {
        logger.info({
          event: "app_config_refresh_stale_discarded",
          refreshGeneration,
          currentGeneration: this.appConfigRefreshGeneration,
        });
        return this.getAppConfig(true);
      }

      if (process.env.NODE_ENV === "development") {
        const aiEnabled = await this.getBoolean(SystemSettingKey.ENABLE_AI, false);
        if (validatedConfig.features.ai?.enabled !== aiEnabled) {
          logger.warn({
            event: "app_config_ai_mismatch",
            featureSnapshot: validatedConfig.features.ai?.enabled,
            getBoolean: aiEnabled,
          });
        }
      }

      // Cache validation success: persist snapshot globally
      this.appConfigCache = Object.freeze(structuredClone(validatedConfig));
      this.appConfigExpiresAt = now + this.APP_CONFIG_TTL;

      if (redis) {
        await redis.set("APP_CONFIG:SNAPSHOT:v2", JSON.stringify(validatedConfig), { ex: 24 * 60 * 60 }).catch(() => {});
      }

      return this.appConfigCache;
    } catch (err: any) {
      logger.error({ message: "❌ Failed validating or loading dynamic app config. Falling back...", error: err.message });
      
      // Preserve last known good config to prevent breaking the client
      if (this.appConfigCache) {
        logger.info("Reusing previous last-known-good AppConfig cache to prevent layout crash.");
        return this.appConfigCache;
      }

      // If no cache exists, load default fallbacks safely
      const fallback = this.buildFallbackConfig();
      this.appConfigCache = fallback;
      this.appConfigExpiresAt = Date.now() + 10 * 1000; // shorter TTL for recovery
      return fallback;
    } finally {
      this.isRefreshingAppConfig = false;
    }
  }

  private buildFallbackConfig(): AppConfigResponse {
    const defaultTime = new Date().toISOString();
    
    // Construct default features from FEATURE_REGISTRY dynamically
    const features: Record<string, any> = {};
    for (const [key, entry] of Object.entries(FEATURE_REGISTRY)) {
      features[key] = {
        enabled: entry.defaultEnabled,
        visible: entry.defaultVisible,
        maintenance: false,
        platform: entry.platform,
        label: entry.label,
        description: entry.description,
        roles: entry.roles,
        dependsOn: entry.dependsOn,
        routePrefixes: entry.routePrefixes
      };
    }

    return {
      version: 1000,
      generatedAt: defaultTime,
      updatedAt: defaultTime,
      maintenanceMode: false,
      readOnlyMode:    false,
      features,
    };
  }

  // ─── Caching & Rebuild Operations ──────────────────────────────────────────

  debouncedRebuildAllCaches() {
    if (this.settingsRebuildTimeout) clearTimeout(this.settingsRebuildTimeout);
    this.settingsRebuildTimeout = setTimeout(async () => {
      this.localSystemSettingsCache = null;
      this.localSystemSettingsExpiresAt = 0;
      const redis = getRedisClient();
      if (redis) await redis.del("SYSTEM_SETTINGS:SNAPSHOT:v1").catch(() => {});
      await this.rebuildSystemSettingsCache();
    }, 200);
  }

  debouncedRebuildRouteCaches() {
    if (this.routesRebuildTimeout) clearTimeout(this.routesRebuildTimeout);
    this.routesRebuildTimeout = setTimeout(async () => {
      this.localRouteToggleCache = null;
      this.localRouteToggleExpiresAt = 0;
      const redis = getRedisClient();
      if (redis) await redis.del("ROUTE_TOGGLES:SNAPSHOT:v1").catch(() => {});
      await this.rebuildRouteToggleCache();
    }, 200);
  }

  debouncedRebuildAuditCaches() {
    if (this.auditsRebuildTimeout) clearTimeout(this.auditsRebuildTimeout);
    this.auditsRebuildTimeout = setTimeout(async () => {
      this.localAuditCache = null;
      this.localAuditExpiresAt = 0;
      const redis = getRedisClient();
      if (redis) await redis.del("SYSTEM_AUDITS:SNAPSHOT:v1").catch(() => {});
      await this.rebuildAuditCache();
    }, 200);
  }

  async rebuildSystemSettingsCache(): Promise<any[] | null> {
    if (this.isRebuildingSettings) return null;
    this.isRebuildingSettings = true;

    const redis = getRedisClient();
    let acquiredLock = false;

    try {
      if (redis) {
        const lock = await redis.set("LOCK:SYSTEM_SETTINGS_REBUILD", "locked", { nx: true, ex: 15 }).catch(() => null);
        if (!lock) return null;
        acquiredLock = true;
      }

      const settings = await settingRepo.findAll();
      
      if (redis) {
        await redis.set("SYSTEM_SETTINGS:SNAPSHOT:v1", JSON.stringify(settings), { ex: 24 * 60 * 60 }).catch(() => {});
      }

      this.localSystemSettingsCache = Object.freeze(structuredClone(settings));
      this.localSystemSettingsExpiresAt = Date.now() + 60 * 60 * 1000;
      return this.localSystemSettingsCache;
    } catch (err: any) {
      logger.error({ message: "Failed to rebuild system settings cache", error: err.message });
      return null;
    } finally {
      this.isRebuildingSettings = false;
      if (redis && acquiredLock) {
        await redis.del("LOCK:SYSTEM_SETTINGS_REBUILD").catch(() => {});
      }
    }
  }

  async rebuildRouteToggleCache(): Promise<any[] | null> {
    if (this.isRebuildingRoutes) return null;
    this.isRebuildingRoutes = true;

    const redis = getRedisClient();
    let acquiredLock = false;

    try {
      if (redis) {
        const lock = await redis.set("LOCK:ROUTES_REBUILD", "locked", { nx: true, ex: 15 }).catch(() => null);
        if (!lock) return null;
        acquiredLock = true;
      }

      const routes = await routeRepo.findAll();

      if (redis) {
        await redis.set("ROUTE_TOGGLES:SNAPSHOT:v1", JSON.stringify(routes), { ex: 24 * 60 * 60 }).catch(() => {});
      }

      this.localRouteToggleCache = Object.freeze(structuredClone(routes));
      this.localRouteToggleExpiresAt = Date.now() + 60 * 60 * 1000;
      return this.localRouteToggleCache;
    } catch (err: any) {
      logger.error({ message: "Failed to rebuild route toggle cache", error: err.message });
      return null;
    } finally {
      this.isRebuildingRoutes = false;
      if (redis && acquiredLock) {
        await redis.del("LOCK:ROUTES_REBUILD").catch(() => {});
      }
    }
  }

  async rebuildAuditCache(limit = 50, offset = 0): Promise<any[] | null> {
    if (this.isRebuildingAudits) return null;
    this.isRebuildingAudits = true;

    const redis = getRedisClient();
    const isDefaultQuery = limit === 50 && offset === 0;

    try {
      const audits = await settingRepo.findAllAudits(limit, offset);

      if (isDefaultQuery) {
        if (redis) {
          await redis.set("SYSTEM_AUDITS:SNAPSHOT:v1", JSON.stringify(audits), { ex: 24 * 60 * 60 }).catch(() => {});
        }
        this.localAuditCache = Object.freeze(structuredClone(audits));
        this.localAuditExpiresAt = Date.now() + 60 * 60 * 1000;
      }

      return audits;
    } catch (err: any) {
      logger.error({ message: "Failed to rebuild system audits cache", error: err.message });
      return null;
    } finally {
      this.isRebuildingAudits = false;
    }
  }

  // ─── System Settings ────────────────────────────────────────────────────────

  async getAll() {
    const now = Date.now();
    
    if (this.localSystemSettingsCache && now < this.localSystemSettingsExpiresAt) {
      return this.localSystemSettingsCache;
    }

    const redis = getRedisClient();
    if (redis) {
      try {
        const cached = await redis.get("SYSTEM_SETTINGS:SNAPSHOT:v1").catch(() => null);
        if (cached) {
          const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
          this.localSystemSettingsCache = Object.freeze(structuredClone(parsed));
          this.localSystemSettingsExpiresAt = Date.now() + 60 * 60 * 1000;
          return this.localSystemSettingsCache;
        }
      } catch (err: any) {
        logger.warn({ message: "Redis read failed in getAll settings, falling back to DB", error: err.message });
      }
    }

    const data = await this.rebuildSystemSettingsCache();
    if (data) return data;

    return settingRepo.findAll();
  }

  async getById(id: string) {
    if (this.localSystemSettingsCache) {
      const found = this.localSystemSettingsCache.find((s: any) => s.id === id);
      if (found) return found;
    }
    return settingRepo.findById(id);
  }

  async getByKey(key: string) {
    if (this.localSystemSettingsCache) {
      const found = this.localSystemSettingsCache.find((s: any) => s.key === key);
      if (found) return found;
    }
    return settingRepo.findByKey(key);
  }

  /**
   * Primary toggle method: update by ID with full audit trail.
   */
  async updateById(
    id:          string,
    value:       string,
    changedById: string,
    reason?:     string
  ) {
    const existing = await this.getById(id);
    if (!existing) throw new Error(`Setting ${id} not found`);

    // Enforce distributed/memory cooldown check for critical keys (Refinement #2)
    await this.checkAndSetCooldown(existing.key, changedById);

    // Enforce typed setting value validation prior to DB write (Refinement #6)
    this.validateSettingValue(existing.key, value, existing.type);

    const updated = await settingRepo.updateById(id, value, changedById);

    // Write audit record
    await settingRepo.createAudit({
      settingKey:  existing.key,
      settingId:   id,
      oldValue:    existing.value,
      newValue:    value,
      changedById,
      reason,
    });

    // Immediate Redis key-value cache update
    await this.setSettingCache(existing.key, value);

    // Eagerly drop bulk snapshot so getByKey/getBoolean cannot read stale rows
    const redis = getRedisClient();
    if (redis) {
      await redis.del("SYSTEM_SETTINGS:SNAPSHOT:v1").catch(() => {});
    }

    // Trigger debounced rebuilds
    this.debouncedRebuildAllCaches();
    this.debouncedRebuildAuditCaches();

    // Synchronously invalidate local memory caches immediately to prevent race conditions in fast subsequent requests
    this.localSystemSettingsCache = null;
    this.localSystemSettingsExpiresAt = 0;

    // Invalidate the full app-config blob since it depends on these settings and track keys
    await this.triggerChange([existing.key]);

    // Record operational event (Realtime Observability)
    const currentVersion = await this.getSettingsVersion();
    await systemSettingEventService.logSettingsUpdated({
      settingKeys: [existing.key],
      triggeredById: changedById,
      settingsVersion: currentVersion,
      oldValue: existing.value,
      newValue: value,
    });

    return updated;
  }

  async createSetting(data: {
    key:         string;
    value:       string;
    displayName: string;
    description: string;
    category:    "FEATURE" | "CRON" | "INTEGRATION" | "MAINTENANCE";
    groupKey:    string;
    isCritical:  boolean;
    createdById: string;
    scopeType?:  "GLOBAL" | "COMPANY" | "USER";
    scopeId?:    string;
  }) {
    const existing = await this.getByKey(data.key);
    if (existing) throw new Error(`Setting ${data.key} already exists`);

    // Enforce type-based format check prior to DB write (Refinement #6)
    const inferredType = data.key.toUpperCase().startsWith("ENABLE_") || data.key.toUpperCase().startsWith("VISIBLE_") ? "BOOLEAN" : "STRING";
    this.validateSettingValue(data.key, data.value, inferredType);

    const setting = await settingRepo.upsertByKey(data);
    
    // Create creation audit
    await settingRepo.createAudit({
      settingKey:  setting.key,
      settingId:   setting.id,
      oldValue:    "NOT_EXIST",
      newValue:    setting.value,
      changedById: data.createdById,
      reason:      "Initial creation via admin UI",
    });

    await this.setSettingCache(setting.key, setting.value);
    
    this.debouncedRebuildAllCaches();
    this.debouncedRebuildAuditCaches();
    await this.triggerChange([setting.key]);

    // Record operational event (Realtime Observability)
    const currentVersion = await this.getSettingsVersion();
    await systemSettingEventService.logSettingsUpdated({
      settingKeys: [setting.key],
      triggeredById: data.createdById,
      settingsVersion: currentVersion,
      oldValue: "NOT_EXIST",
      newValue: setting.value,
    });

    return setting;
  }

  /**
   * Secondary: update by key (convenience for programmatic use).
   */
  async updateByKey(
    key:         string,
    value:       string,
    changedById: string,
    reason?:     string
  ) {
    const existing = await this.getByKey(key);
    if (!existing) throw new Error(`Setting key ${key} not found`);
    return this.updateById(existing.id, value, changedById, reason);
  }

  /**
   * Normalizes Redis/cache values. Upstash may return booleans instead of "true"/"false" strings.
   */
  private parseBooleanCacheValue(cached: unknown): boolean | null {
    if (cached === null || cached === undefined) return null;
    if (typeof cached === "boolean") return cached;
    const normalized = String(cached).trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
    return null;
  }

  /**
   * Read a boolean setting: Redis → DB → defaultValue.
   * This is the hot-path used by middleware on every request.
   */
  async getBoolean(key: string, defaultValue = true): Promise<boolean> {
    const cached = await this.getSettingCache(key);
    const parsedCache = this.parseBooleanCacheValue(cached);
    if (parsedCache !== null) return parsedCache;

    // Hot path: read directly from DB — never the bulk settings snapshot cache
    const record = await settingRepo.findByKey(key);
    if (!record) return defaultValue;

    await this.setSettingCache(key, record.value);
    return record.value === "true";
  }

  async getString(key: string, defaultValue = ""): Promise<string> {
    const cached = await this.getSettingCache(key);
    if (cached !== null) return cached;

    const record = await settingRepo.findByKey(key);
    if (!record) return defaultValue;

    await this.setSettingCache(key, record.value);
    return record.value;
  }

  /** Exposes per-key Redis cache for observability (feature guard debug). */
  async getSettingCacheValue(key: string): Promise<string | null> {
    return this.getSettingCache(key);
  }

  async getAllAudits(limit = 50, offset = 0) {
    const isDefaultQuery = limit === 50 && offset === 0;
    const now = Date.now();

    if (isDefaultQuery && this.localAuditCache && now < this.localAuditExpiresAt) {
      return this.localAuditCache;
    }

    const redis = getRedisClient();
    if (isDefaultQuery && redis) {
      try {
        const cached = await redis.get("SYSTEM_AUDITS:SNAPSHOT:v1").catch(() => null);
        if (cached) {
          const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
          this.localAuditCache = Object.freeze(structuredClone(parsed));
          this.localAuditExpiresAt = Date.now() + 60 * 60 * 1000;
          return this.localAuditCache;
        }
      } catch (err: any) {
        logger.warn({ message: "Redis read failed in getAllAudits, falling back to DB", error: err.message });
      }
    }

    const data = await this.rebuildAuditCache(limit, offset);
    if (data && isDefaultQuery) return data;

    return settingRepo.findAllAudits(limit, offset);
  }

  // ─── Route Toggles ─────────────────────────────────────────────────────────

  async getAllRouteToggles() {
    const now = Date.now();

    if (this.localRouteToggleCache && now < this.localRouteToggleExpiresAt) {
      return this.localRouteToggleCache;
    }

    const redis = getRedisClient();
    if (redis) {
      try {
        const cached = await redis.get("ROUTE_TOGGLES:SNAPSHOT:v1").catch(() => null);
        if (cached) {
          const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
          this.localRouteToggleCache = Object.freeze(structuredClone(parsed));
          this.localRouteToggleExpiresAt = Date.now() + 60 * 60 * 1000;
          return this.localRouteToggleCache;
        }
      } catch (err: any) {
        logger.warn({ message: "Redis read failed in getAllRouteToggles, falling back to DB", error: err.message });
      }
    }

    const data = await this.rebuildRouteToggleCache();
    if (data) return data;

    return routeRepo.findAll();
  }

  async getRouteToggleById(id: string) {
    if (this.localRouteToggleCache) {
      const found = this.localRouteToggleCache.find((r: any) => r.id === id);
      if (found) return found;
    }
    return routeRepo.findById(id);
  }

  async createRouteToggle(data: {
    method:       string;
    path:         string;
    enabled?:     boolean;
    displayName?: string;
    description?: string;
    groupKey?:    string;
    moduleKey?:   string;
    isCritical?:  boolean;
    createdById?: string;
  }) {
    const toggle = await routeRepo.create(data);
    await this.setRouteCache(toggle.method, toggle.path, toggle.enabled);
    
    this.debouncedRebuildRouteCaches();
    await this.triggerChange([toggle.moduleKey || ""]);
    return toggle;
  }

  async updateRouteToggleById(
    id:          string,
    enabled:     boolean,
    changedById: string,
    reason?:     string
  ) {
    const existing = await this.getRouteToggleById(id);
    if (!existing) throw new Error(`RouteToggle ${id} not found`);

    const updated = await routeRepo.updateById(id, enabled);

    await routeRepo.createAudit({
      routeToggleId: id,
      oldValue:      existing.enabled,
      newValue:      enabled,
      changedById,
      reason,
    });

    await this.setRouteCache(existing.method, existing.path, enabled);
    
    this.debouncedRebuildRouteCaches();
    this.debouncedRebuildAuditCaches();

    // Synchronously invalidate local memory caches immediately to prevent race conditions in fast subsequent requests
    this.localRouteToggleCache = null;
    this.localRouteToggleExpiresAt = 0;

    await this.triggerChange([existing.moduleKey || ""]);

    return updated;
  }

  async deleteRouteToggle(id: string) {
    const existing = await this.getRouteToggleById(id);
    if (!existing) throw new Error(`RouteToggle ${id} not found`);

    await routeRepo.deleteById(id);
    await this.invalidateRouteCache(existing.method, existing.path);
    
    this.debouncedRebuildRouteCaches();
    await this.triggerChange([existing.moduleKey || ""]);
  }

  async getRouteToggleAudits(routeToggleId: string) {
    return routeRepo.findAudits(routeToggleId);
  }

  // ─── Bulk Operations ───────────────────────────────────────────────────────

  async bulkToggleModule(moduleKey: string, enabled: boolean, changedById: string) {
    const allRoutes = (await this.getAllRouteToggles()) || [];
    const allSettings = (await this.getAll()) || [];

    const moduleRoutes = allRoutes.filter((r: any) => r.moduleKey === moduleKey || r.groupKey === moduleKey);
    const moduleSettings = allSettings.filter((s: any) => s.groupKey === moduleKey && s.type === "BOOLEAN");

    for (const route of moduleRoutes) {
      if (route.enabled !== enabled) {
        await this.updateRouteToggleById(route.id, enabled, changedById, `Bulk module toggle for ${moduleKey}`);
      }
    }

    for (const setting of moduleSettings) {
      if ((setting.value === "true") !== enabled) {
        await this.updateById(setting.id, enabled ? "true" : "false", changedById, `Bulk module toggle for ${moduleKey}`);
      }
    }

    return {
      message: `Toggled ${moduleRoutes.length} routes and ${moduleSettings.length} settings in module ${moduleKey}`,
      routesCount: moduleRoutes.length,
      settingsCount: moduleSettings.length
    };
  }

  /**
   * Hot-path: checks if a specific method + path combination is enabled.
   * Used by globalRouteGuard on every request.
   */
  async isRouteEnabled(method: string, path: string): Promise<boolean> {
    if (this.localRouteToggleCache) {
      const found = this.localRouteToggleCache.find((r: any) => 
        r.method.toUpperCase() === method.toUpperCase() && 
        r.path.toLowerCase().replace(/\/+$/, "") === path.toLowerCase().replace(/\/+$/, "")
      );
      if (found) return found.enabled;
    }

    const redis   = getRedisClient();
    const cacheKey = this.buildRouteCacheKey(method, path);

    if (redis) {
      const cached = (await redis.get(cacheKey).catch(() => null)) as string | null;
      if (cached !== null) return cached !== "false";
    }

    const toggle = await routeRepo.findByMethodAndPath(method, path);
    if (!toggle) return true;

    if (redis) {
      await redis.set(cacheKey, String(toggle.enabled), { ex: CACHE_TTL_SECONDS }).catch(() => {});
    }

    return toggle.enabled;
  }

  /** Bulk refresh all settings into Redis on startup */
  async refreshSettingsCache() {
    const redis = getRedisClient();
    if (!redis) return;

    const settings = await settingRepo.findAll();
    const pipeline = redis.pipeline();
    for (const s of settings) {
      pipeline.set(`${CACHE_PREFIX_SETTING}${s.key}`, s.value, { ex: CACHE_TTL_SECONDS });
    }
    await pipeline.exec().catch(() => {});
  }

  // ─── Private Cache Helpers ─────────────────────────────────────────────────

  private buildRouteCacheKey(method: string, path: string) {
    return `${CACHE_PREFIX_ROUTE}${method.toUpperCase()}:${path.toLowerCase().replace(/\/+$/, "")}`;
  }

  private async getSettingCache(key: string): Promise<string | null> {
    const redis = getRedisClient();
    if (!redis) return null;
    return (await redis.get(`${CACHE_PREFIX_SETTING}${key}`).catch(() => null)) as string | null;
  }

  private async setSettingCache(key: string, value: string) {
    const redis = getRedisClient();
    if (!redis) return;
    await redis.set(`${CACHE_PREFIX_SETTING}${key}`, value, { ex: CACHE_TTL_SECONDS }).catch(() => {});
  }

  private async invalidateSettingCache(key: string) {
    const redis = getRedisClient();
    if (!redis) return;
    await redis.del(`${CACHE_PREFIX_SETTING}${key}`).catch(() => {});
  }

  private async setRouteCache(method: string, path: string, enabled: boolean) {
    const redis = getRedisClient();
    if (!redis) return;
    const cacheKey = this.buildRouteCacheKey(method, path);
    await redis.set(cacheKey, String(enabled), { ex: CACHE_TTL_SECONDS }).catch(() => {});
  }

  private async invalidateRouteCache(method: string, path: string) {
    const redis = getRedisClient();
    if (!redis) return;
    await redis.del(this.buildRouteCacheKey(method, path)).catch(() => {});
  }

  private invalidateAppConfigCache() {
    this.appConfigRefreshGeneration += 1;
    this.appConfigCache = null;
    this.appConfigExpiresAt = 0;

    const redis = getRedisClient();
    if (!redis) return;
    redis.del(APPCONFIG_CACHE_KEY).catch(() => {});
    redis.del("APP_CONFIG:SNAPSHOT:v2").catch(() => {});
  }
}

export const systemSettingsService = new SystemSettingService();

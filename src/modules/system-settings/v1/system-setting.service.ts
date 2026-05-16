import { getRedisClient } from "../../../config/redis";
import {
  APPCONFIG_CACHE_KEY,
  CACHE_PREFIX_ROUTE,
  CACHE_PREFIX_SETTING,
  CACHE_TTL_SECONDS,
} from "./system-setting.types";
import { logger } from "../../../utils/logger";
import {
  RouteToggleRepository,
  SystemSettingRepository,
} from "./system-setting.repository";

const settingRepo = new SystemSettingRepository();
const routeRepo   = new RouteToggleRepository();

export class SystemSettingService {
  private onChangeCallbacks: (() => Promise<void>)[] = [];

  // Memory Caches
  private localSystemSettingsCache: any = null;
  private localSystemSettingsExpiresAt = 0;

  private localRouteToggleCache: any = null;
  private localRouteToggleExpiresAt = 0;

  private localAuditCache: any = null;
  private localAuditExpiresAt = 0;

  // Rebuilding states (local single-flight locks)
  private isRebuildingSettings = false;
  private isRebuildingRoutes = false;
  private isRebuildingAudits = false;

  // Debouncing timeouts
  private settingsRebuildTimeout: NodeJS.Timeout | null = null;
  private routesRebuildTimeout: NodeJS.Timeout | null = null;
  private auditsRebuildTimeout: NodeJS.Timeout | null = null;

  registerOnChange(callback: () => Promise<void>) {
    this.onChangeCallbacks.push(callback);
  }

  async triggerChange() {
    await this.invalidateAppConfigCache();
    
    // Asynchronously call callbacks safely to avoid blocking write operations
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

    // Trigger debounced rebuilds
    this.debouncedRebuildAllCaches();
    this.debouncedRebuildAuditCaches();

    // Invalidate the full app-config blob since it depends on these settings
    await this.triggerChange();

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
  }) {
    const existing = await this.getByKey(data.key);
    if (existing) throw new Error(`Setting ${data.key} already exists`);

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
    await this.triggerChange();
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
   * Read a boolean setting: Redis → DB → defaultValue.
   * This is the hot-path used by middleware on every request.
   */
  async getBoolean(key: string, defaultValue = true): Promise<boolean> {
    const cached = await this.getSettingCache(key);
    if (cached !== null) return cached === "true";

    const record = await this.getByKey(key);
    if (!record) return defaultValue;

    // Repopulate cache
    await this.setSettingCache(key, record.value);
    return record.value === "true";
  }

  async getString(key: string, defaultValue = ""): Promise<string> {
    const cached = await this.getSettingCache(key);
    if (cached !== null) return cached;

    const record = await this.getByKey(key);
    if (!record) return defaultValue;

    await this.setSettingCache(key, record.value);
    return record.value;
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
    await this.triggerChange();
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
    await this.triggerChange();

    return updated;
  }

  async deleteRouteToggle(id: string) {
    const existing = await this.getRouteToggleById(id);
    if (!existing) throw new Error(`RouteToggle ${id} not found`);

    await routeRepo.deleteById(id);
    await this.invalidateRouteCache(existing.method, existing.path);
    
    this.debouncedRebuildRouteCaches();
    await this.triggerChange();
  }

  async getRouteToggleAudits(routeToggleId: string) {
    return routeRepo.findAudits(routeToggleId);
  }

  // ─── Bulk Operations ───────────────────────────────────────────────────────

  async bulkToggleModule(moduleKey: string, enabled: boolean, changedById: string) {
    // 1. Find all routes and settings belonging to this module
    const allRoutes = (await this.getAllRouteToggles()) || [];
    const allSettings = (await this.getAll()) || [];

    const moduleRoutes = allRoutes.filter((r: any) => r.moduleKey === moduleKey || r.groupKey === moduleKey);
    const moduleSettings = allSettings.filter((s: any) => s.groupKey === moduleKey && s.type === "BOOLEAN");

    // 2. Toggle all routes
    for (const route of moduleRoutes) {
      if (route.enabled !== enabled) {
        await this.updateRouteToggleById(route.id, enabled, changedById, `Bulk module toggle for ${moduleKey}`);
      }
    }

    // 3. Toggle all settings
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
    // Check local memory route toggles cache first (takes <1ms)
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
    if (!toggle) return true; // not registered = always ON

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

  private async invalidateAppConfigCache() {
    const redis = getRedisClient();
    if (!redis) return;
    await redis.del(APPCONFIG_CACHE_KEY).catch(() => {});
    await redis.del("APP_CONFIG:SNAPSHOT:v1").catch(() => {});
  }
}

// Singleton export for use across middleware and crons
export const systemSettingsService = new SystemSettingService();

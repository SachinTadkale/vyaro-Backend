import { getRedisClient } from "../../../config/redis";
import {
  APPCONFIG_CACHE_KEY,
  CACHE_PREFIX_ROUTE,
  CACHE_PREFIX_SETTING,
  CACHE_TTL_SECONDS,
} from "./system-setting.types";
import {
  RouteToggleRepository,
  SystemSettingRepository,
} from "./system-setting.repository";

const settingRepo = new SystemSettingRepository();
const routeRepo   = new RouteToggleRepository();

export class SystemSettingService {
  // ─── System Settings ────────────────────────────────────────────────────────



  async getAll() {
    return settingRepo.findAll();
  }

  async getById(id: string) {
    return settingRepo.findById(id);
  }

  async getByKey(key: string) {
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
    const existing = await settingRepo.findById(id);
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

    // Immediate Redis invalidation + refresh
    await this.invalidateSettingCache(existing.key);
    await this.setSettingCache(existing.key, value);

    // Invalidate the full app-config blob since it depends on these settings
    await this.invalidateAppConfigCache();

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
    const existing = await settingRepo.findByKey(data.key);
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
    await this.invalidateAppConfigCache();
    return setting;
  }

  /**
   * Secondary: update by key (convenience for cron/internal use).
   */
  async updateByKey(
    key:         string,
    value:       string,
    changedById: string,
    reason?:     string
  ) {
    const existing = await settingRepo.findByKey(key);
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

    const record = await settingRepo.findByKey(key);
    if (!record) return defaultValue;

    // Repopulate cache
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

  async getAllAudits(limit = 50, offset = 0) {
    return settingRepo.findAllAudits(limit, offset);
  }

  // ─── Route Toggles ─────────────────────────────────────────────────────────

  async getAllRouteToggles() {
    return routeRepo.findAll();
  }

  async getRouteToggleById(id: string) {
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
    return toggle;
  }

  async updateRouteToggleById(
    id:          string,
    enabled:     boolean,
    changedById: string,
    reason?:     string
  ) {
    const existing = await routeRepo.findById(id);
    if (!existing) throw new Error(`RouteToggle ${id} not found`);

    const updated = await routeRepo.updateById(id, enabled);

    await routeRepo.createAudit({
      routeToggleId: id,
      oldValue:      existing.enabled,
      newValue:      enabled,
      changedById,
      reason,
    });

    // Immediate cache update
    await this.setRouteCache(existing.method, existing.path, enabled);

    return updated;
  }

  async deleteRouteToggle(id: string) {
    const existing = await routeRepo.findById(id);
    if (!existing) throw new Error(`RouteToggle ${id} not found`);

    await routeRepo.deleteById(id);
    await this.invalidateRouteCache(existing.method, existing.path);
  }

  async getRouteToggleAudits(routeToggleId: string) {
    return routeRepo.findAudits(routeToggleId);
  }

  // ─── Bulk Operations ───────────────────────────────────────────────────────

  async bulkToggleModule(moduleKey: string, enabled: boolean, changedById: string) {
    // 1. Find all routes and settings belonging to this module
    const allRoutes = await routeRepo.findAll();
    const allSettings = await settingRepo.findAll();

    const moduleRoutes = allRoutes.filter(r => r.moduleKey === moduleKey || r.groupKey === moduleKey);
    const moduleSettings = allSettings.filter(s => s.groupKey === moduleKey && s.type === "BOOLEAN");

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
  }
}

// Singleton export for use across middleware and crons
export const systemSettingsService = new SystemSettingService();

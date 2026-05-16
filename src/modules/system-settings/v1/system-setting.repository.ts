import prisma from "../../../config/prisma";
import { DEFAULT_SETTINGS } from "./system-setting.types";

export class SystemSettingRepository {
  /** Returns all visible settings */
  async findAll() {
    return prisma.systemSetting.findMany({
      orderBy: [{ category: "asc" }, { key: "asc" }],
    });
  }

  /** Finds a single setting by its cuid id */
  async findById(id: string) {
    return prisma.systemSetting.findUnique({ where: { id } });
  }

  /** Finds a single setting by its key */
  async findByKey(key: string) {
    return prisma.systemSetting.findUnique({ where: { key } });
  }

  /**
   * Updates a setting value by ID.
   * Also stamps updatedById + lastChangedAt.
   */
  async updateById(id: string, value: string, updatedById: string) {
    return prisma.systemSetting.update({
      where: { id },
      data: { value, updatedById, lastChangedAt: new Date() },
    });
  }

  /**
   * Idempotent seed: creates a setting only if it doesn't exist yet.
   */
  async upsertByKey(data: {
    key: string;
    value: string;
    displayName?: string;
    description?: string;
    category?: "FEATURE" | "CRON" | "INTEGRATION" | "MAINTENANCE";
    groupKey?: string;
    isCritical?: boolean;
  }) {
    return prisma.systemSetting.upsert({
      where:  { key: data.key },
      update: {},                         // never overwrite existing live value on seed
      create: {
        key:         data.key,
        value:       data.value,
        displayName: data.displayName,
        description: data.description,
        category:    data.category ?? "FEATURE",
        groupKey:    data.groupKey,
        isCritical:  data.isCritical ?? false,
      },
    });
  }

  /** Seeds all default settings from DEFAULT_SETTINGS */
  async seedDefaults() {
    for (const s of DEFAULT_SETTINGS) {
      await this.upsertByKey(s);
    }
    console.log(`✅ SystemSettings: seeded ${DEFAULT_SETTINGS.length} defaults.`);
  }

  /** Returns all audits for a given setting key */
  async findAudits(settingKey: string) {
    return prisma.systemSettingAudit.findMany({
      where:   { settingKey },
      include: { changedBy: { select: { user_id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Returns all audits (paginated) */
  async findAllAudits(limit = 50, offset = 0) {
    return prisma.systemSettingAudit.findMany({
      include: { changedBy: { select: { user_id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take:    limit,
      skip:    offset,
    });
  }

  /** Creates an audit record */
  async createAudit(data: {
    settingKey:  string;
    settingId?:  string;
    oldValue:    string;
    newValue:    string;
    changedById: string;
    reason?:     string;
  }) {
    return prisma.systemSettingAudit.create({ data });
  }
}

// ─── Route Toggle Repository ───────────────────────────────────────────────

export class RouteToggleRepository {
  async findAll() {
    return prisma.routeToggle.findMany({
      orderBy: [{ groupKey: "asc" }, { method: "asc" }, { path: "asc" }],
    });
  }

  async findById(id: string) {
    return prisma.routeToggle.findUnique({ where: { id } });
  }

  async findByMethodAndPath(method: string, path: string) {
    return prisma.routeToggle.findUnique({
      where: { method_path: { method: method.toUpperCase(), path } },
    });
  }

  async create(data: {
    method:       string;
    path:         string;
    enabled?:     boolean;
    displayName?: string;
    description?: string;
    groupKey?:    string;
    isCritical?:  boolean;
  }) {
    return prisma.routeToggle.create({
      data: {
        method:      data.method.toUpperCase(),
        path:        data.path.toLowerCase().replace(/\/+$/, ""),
        enabled:     data.enabled ?? true,
        displayName: data.displayName,
        description: data.description,
        groupKey:    data.groupKey,
        isCritical:  data.isCritical ?? false,
      },
    });
  }

  async updateById(id: string, enabled: boolean) {
    return prisma.routeToggle.update({
      where: { id },
      data:  { enabled },
    });
  }

  async deleteById(id: string) {
    return prisma.routeToggle.delete({ where: { id } });
  }

  async createAudit(data: {
    routeToggleId: string;
    oldValue:      boolean;
    newValue:      boolean;
    changedById:   string;
    reason?:       string;
  }) {
    return prisma.routeToggleAudit.create({ data });
  }

  async findAudits(routeToggleId: string) {
    return prisma.routeToggleAudit.findMany({
      where:   { routeToggleId },
      include: { changedBy: { select: { user_id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
}

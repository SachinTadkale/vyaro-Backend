import prisma from "../../../config/prisma";
import { logger } from "../../../utils/logger";

export const SETTING_EVENT_TYPES = {
  SETTINGS_UPDATED: "SETTINGS_UPDATED",
  SOCKET_BROADCAST_SENT: "SOCKET_BROADCAST_SENT",
  CACHE_INVALIDATED: "CACHE_INVALIDATED",
  REALTIME_SYNC_FAILED: "REALTIME_SYNC_FAILED",
  COOLDOWN_BLOCKED: "COOLDOWN_BLOCKED",
} as const;

export class SystemSettingEventService {
  /**
   * Decoupled Event Creator
   * Always runs inside try/catch blocks and fails silently to prevent logging failures
   * from interrupting primary operational updates.
   */
  async createEvent(data: {
    eventType:            string;
    settingKeys:          string[];
    triggeredById?:       string | null;
    settingsVersion:      number;
    affectedClients?:     number | null;
    broadcastDurationMs?: number | null;
    propagationStatus?:   string | null;
    metadata?:            any;
  }) {
    try {
      return await prisma.systemSettingEvent.create({
        data: {
          eventType:           data.eventType,
          settingKeys:         data.settingKeys,
          triggeredById:       data.triggeredById || null,
          settingsVersion:     data.settingsVersion,
          affectedClients:     data.affectedClients || null,
          broadcastDurationMs: data.broadcastDurationMs || null,
          propagationStatus:   data.propagationStatus || null,
          metadata:            data.metadata || null,
        },
      });
    } catch (error: any) {
      logger.error({
        message: "Failed to record SystemSettingEvent, failing silently",
        error: error.message,
        data,
      });
      return null;
    }
  }

  async logSettingsUpdated(params: {
    settingKeys:     string[];
    triggeredById:   string | null;
    settingsVersion: number;
    oldValue?:       string;
    newValue?:       string;
  }) {
    return this.createEvent({
      eventType: SETTING_EVENT_TYPES.SETTINGS_UPDATED,
      settingKeys: params.settingKeys,
      triggeredById: params.triggeredById,
      settingsVersion: params.settingsVersion,
      metadata: {
        oldValue: params.oldValue,
        newValue: params.newValue,
      },
    });
  }

  async logBroadcast(params: {
    settingKeys:         string[];
    settingsVersion:     number;
    affectedClients:     number;
    broadcastDurationMs: number;
    propagationStatus:   string;
  }) {
    return this.createEvent({
      eventType: SETTING_EVENT_TYPES.SOCKET_BROADCAST_SENT,
      settingKeys: params.settingKeys,
      settingsVersion: params.settingsVersion,
      affectedClients: params.affectedClients,
      broadcastDurationMs: params.broadcastDurationMs,
      propagationStatus: params.propagationStatus,
    });
  }

  async logCooldownBlocked(params: {
    settingKey:            string;
    remainingCooldownSecs: number;
    triggeredById:         string | null;
    settingsVersion:       number;
  }) {
    return this.createEvent({
      eventType: SETTING_EVENT_TYPES.COOLDOWN_BLOCKED,
      settingKeys: [params.settingKey],
      triggeredById: params.triggeredById,
      settingsVersion: params.settingsVersion,
      metadata: {
        remainingCooldownSecs: params.remainingCooldownSecs,
      },
    });
  }

  async logSyncFailure(params: {
    settingKeys:     string[];
    settingsVersion: number;
    error:           string;
  }) {
    return this.createEvent({
      eventType: SETTING_EVENT_TYPES.REALTIME_SYNC_FAILED,
      settingKeys: params.settingKeys,
      settingsVersion: params.settingsVersion,
      metadata: {
        error: params.error,
      },
    });
  }

  /**
   * Retrieves operational setting events with flexible filtering.
   * Client-side filters are used for JSON key list matching to ensure 100% database engine compatibility.
   */
  async getEvents(params: {
    limit?:     number;
    offset?:    number;
    eventType?: string;
    searchKey?: string;
    startDate?: string;
    endDate?:   string;
  }) {
    const limit = params.limit || 50;
    const offset = params.offset || 0;

    const where: any = {};
    if (params.eventType) {
      where.eventType = params.eventType;
    }

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        where.createdAt.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        where.createdAt.lte = new Date(params.endDate);
      }
    }

    // Load matching event types & date ranges
    const items = await prisma.systemSettingEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        triggeredBy: {
          select: {
            user_id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    // In-memory key matching for JSON structures to avoid dialect-specific Prisma quirks
    let filtered = items;
    if (params.searchKey) {
      const searchLower = params.searchKey.toLowerCase();
      filtered = items.filter((item: any) => {
        if (!item.settingKeys) return false;
        try {
          const keys = typeof item.settingKeys === "string"
            ? JSON.parse(item.settingKeys)
            : item.settingKeys;
          return Array.isArray(keys) && keys.some((k: any) => String(k).toLowerCase().includes(searchLower));
        } catch {
          return false;
        }
      });
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return { total, items: paginated };
  }
}

export const systemSettingEventService = new SystemSettingEventService();

import { Request, Response } from "express";
import { systemSettingsService } from "./system-setting.service";

// ─── System Settings ────────────────────────────────────────────────────────

/**
 * POST /system-settings
 * Creates a new system setting dynamically.
 */
export const createSetting = async (req: Request, res: Response) => {
  try {
    const { key, value, displayName, description, category, groupKey, isCritical } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ success: false, message: "key and value are required" });
    }

    const createdById = req.user.userId;
    const setting = await systemSettingsService.createSetting({
      key, value: String(value), displayName, description, category, groupKey, isCritical, createdById
    });

    res.status(201).json({ success: true, data: setting, message: "System setting created" });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * GET /system-settings
 * Returns all system settings.
 */
export const getAllSettings = async (req: Request, res: Response) => {
  try {
    const settings = await systemSettingsService.getAll();
    res.json({ success: true, data: settings });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * GET /system-settings/:id
 * Returns a single setting by ID (primary) or falls back to key.
 */
export const getSettingById = async (req: Request, res: Response) => {
  try {
    const setting = await systemSettingsService.getById(req.params.id);
    if (!setting) return res.status(404).json({ success: false, message: "Setting not found" });
    res.json({ success: true, data: setting });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * PATCH /system-settings/:id
 * Primary toggle endpoint — updates a setting by ID.
 * Body: { value: string, reason?: string }
 */
export const updateSettingById = async (req: Request, res: Response) => {
  try {
    const { value, reason } = req.body;
    if (value === undefined) {
      return res.status(400).json({ success: false, message: "value is required" });
    }

    const changedById = req.user.userId;
    const updated = await systemSettingsService.updateById(
      req.params.id,
      String(value),
      changedById,
      reason
    );

    res.json({ success: true, data: updated, message: "Setting updated" });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * PATCH /system-settings/key/:key
 * Secondary — updates a setting by key string (for programmatic access).
 */
export const updateSettingByKey = async (req: Request, res: Response) => {
  try {
    const { value, reason } = req.body;
    if (value === undefined) {
      return res.status(400).json({ success: false, message: "value is required" });
    }

    const changedById = req.user.userId;
    const updated = await systemSettingsService.updateByKey(
      req.params.key,
      String(value),
      changedById,
      reason
    );

    res.json({ success: true, data: updated, message: "Setting updated" });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * GET /system-settings/audits
 * Returns all setting change history.
 * Query: ?limit=50&offset=0
 */
export const getSettingAudits = async (req: Request, res: Response) => {
  try {
    const limit  = parseInt(req.query.limit  as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const audits = await systemSettingsService.getAllAudits(limit, offset);
    res.json({ success: true, data: audits });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─── Bulk Actions ────────────────────────────────────────────────────────────

/**
 * PATCH /system-settings/modules/:moduleKey/toggle
 * Bulk toggles all settings and routes belonging to a module.
 */
export const bulkToggleModule = async (req: Request, res: Response) => {
  try {
    const { enabled } = req.body;
    if (enabled === undefined) {
      return res.status(400).json({ success: false, message: "enabled (boolean) is required" });
    }

    const changedById = req.user.userId;
    const result = await systemSettingsService.bulkToggleModule(
      req.params.moduleKey,
      Boolean(enabled),
      changedById
    );

    res.json({ success: true, data: result, message: result.message });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─── Route Toggles ─────────────────────────────────────────────────────────

/**
 * GET /system-settings/routes
 * Returns all registered route toggles.
 */
export const getAllRouteToggles = async (_req: Request, res: Response) => {
  try {
    const routes = await systemSettingsService.getAllRouteToggles();
    res.json({ success: true, data: routes });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * GET /system-settings/routes/:id
 * Returns a single route toggle by ID.
 */
export const getRouteToggleById = async (req: Request, res: Response) => {
  try {
    const toggle = await systemSettingsService.getRouteToggleById(req.params.id);
    if (!toggle) return res.status(404).json({ success: false, message: "Route toggle not found" });
    res.json({ success: true, data: toggle });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * POST /system-settings/routes
 * Registers a new route toggle.
 * Body: { method, path, enabled?, displayName?, description?, groupKey?, isCritical? }
 */
export const createRouteToggle = async (req: Request, res: Response) => {
  try {
    const { method, path, enabled, displayName, description, groupKey, moduleKey, isCritical } = req.body;
    if (!method || !path) {
      return res.status(400).json({ success: false, message: "method and path are required" });
    }

    const createdById = req.user.userId;
    const toggle = await systemSettingsService.createRouteToggle({
      method, path, enabled, displayName, description, groupKey, moduleKey, isCritical, createdById
    });

    res.status(201).json({ success: true, data: toggle, message: "Route toggle registered" });
  } catch (e: any) {
    if (e.code === "P2002") {
      return res.status(409).json({ success: false, message: "Route toggle already exists" });
    }
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * PATCH /system-settings/routes/:id
 * Primary toggle — enables or disables a route by ID.
 * Body: { enabled: boolean, reason?: string }
 */
export const updateRouteToggleById = async (req: Request, res: Response) => {
  try {
    const { enabled, reason } = req.body;
    if (enabled === undefined) {
      return res.status(400).json({ success: false, message: "enabled (boolean) is required" });
    }

    const changedById = req.user.userId;
    const updated = await systemSettingsService.updateRouteToggleById(
      req.params.id,
      Boolean(enabled),
      changedById,
      reason
    );

    res.json({ success: true, data: updated, message: `Route ${enabled ? "enabled" : "disabled"}` });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * DELETE /system-settings/routes/:id
 * Removes a route toggle (route becomes always-ON again).
 */
export const deleteRouteToggle = async (req: Request, res: Response) => {
  try {
    await systemSettingsService.deleteRouteToggle(req.params.id);
    res.json({ success: true, message: "Route toggle removed. Route is now always enabled." });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * GET /system-settings/routes/:id/audits
 * Returns audit history for a specific route toggle.
 */
export const getRouteToggleAudits = async (req: Request, res: Response) => {
  try {
    const audits = await systemSettingsService.getRouteToggleAudits(req.params.id);
    res.json({ success: true, data: audits });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

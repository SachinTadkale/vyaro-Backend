import { Router } from "express";
import { authMiddleware } from "../../../middleware/auth.middleware";
import { requireOwnerAccess } from "../../../middleware/owner.middleware";
import {
  getAllSettings,
  getSettingById,
  updateSettingById,
  updateSettingByKey,
  getSettingAudits,
  getAllRouteToggles,
  getRouteToggleById,
  createRouteToggle,
  updateRouteToggleById,
  deleteRouteToggle,
  getRouteToggleAudits,
} from "./system-setting.controller";

const router = Router();

// All system-setting routes require authentication + OWNER role
router.use(authMiddleware, requireOwnerAccess);

// ─── System Settings ────────────────────────────────────────────────────────

/**
 * GET  /system-settings              → All settings
 * GET  /system-settings/audits       → All audit history
 * GET  /system-settings/:id          → Single setting by ID (primary)
 * PATCH /system-settings/:id         → Update by ID (primary toggle)
 * PATCH /system-settings/key/:key    → Update by key (secondary)
 */
// ─── System Settings (Static) ────────────────────────────────────────────────
router.get   ("/audits",      getSettingAudits);
router.get   ("/",            getAllSettings);
router.patch ("/key/:key",    updateSettingByKey);

// ─── Route Toggles ─────────────────────────────────────────────────────────
router.get    ("/routes",              getAllRouteToggles);
router.post   ("/routes",              createRouteToggle);
router.get    ("/routes/:id",          getRouteToggleById);
router.patch  ("/routes/:id",          updateRouteToggleById);
router.delete ("/routes/:id",          deleteRouteToggle);
router.get    ("/routes/:id/audits",   getRouteToggleAudits);

// ─── System Settings (Parametric) ───────────────────────────────────────────
router.get   ("/:id",         getSettingById);
router.patch ("/:id",         updateSettingById);

export default router;

import { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { systemSettingsService } from "../modules/system-settings/v1/system-setting.service";
import { SystemSettingKey } from "../modules/system-settings/v1/system-setting.types";
import { logger } from "../utils/logger";

// ── Route bypass definitions ──────────────────────────────────────────────────

/**
 * Paths that are ALWAYS accessible, even during maintenance mode.
 * These are health checks, owner/admin controls, and auth for privileged roles.
 */
const MAINTENANCE_BYPASS_PREFIXES = [
  "/api/v1/health",
  "/api/v1/system-settings",
  "/api/v1/auth/admin",
  "/api/v1/admin",
];

/**
 * Auth routes that are still accessible during maintenance mode.
 * (OWNER/ADMIN can still log in to disable maintenance)
 */
const MAINTENANCE_BYPASS_EXACT = [
  "/api/v1/",
];

/**
 * Registration-specific route paths (used by DISABLE_REGISTRATIONS).
 */
const REGISTRATION_PATHS = [
  "/api/v1/auth/user/register",
  "/api/v1/auth/user/send-otp",
  "/api/v1/leads",
];

/**
 * HTTP methods that are blocked during READ_ONLY_MODE.
 */
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// ── Roles that bypass guards ──────────────────────────────────────────────────

const PRIVILEGED_ROLES = new Set<string>([UserRole.OWNER, UserRole.ADMIN]);

// ── Main Guard ────────────────────────────────────────────────────────────────

/**
 * Middleware: globalRouteGuard
 *
 * Unified runtime control guard. Mounted before all v1 routes in app.ts.
 *
 * Checks in order:
 *  1. Privileged role bypass  → OWNER and ADMIN skip all guards
 *  2. Always-allowed paths    → health, system-settings, admin auth
 *  3. MAINTENANCE_MODE        → blocks all public API access (503)
 *  4. READ_ONLY_MODE          → blocks all write methods (503)
 *  5. DISABLE_REGISTRATIONS   → blocks registration endpoints (503)
 *  6. Per-route toggle        → blocks individually disabled routes (503)
 */
export const globalRouteGuard = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const rawPath = req.path;
    const method  = req.method.toUpperCase();

    // ── 1. Privileged role bypass ─────────────────────────────────────────────
    if (req.user?.role && PRIVILEGED_ROLES.has(req.user.role)) {
      return next();
    }

    // ── 2. Always-allowed paths ───────────────────────────────────────────────
    if (isAlwaysAllowed(rawPath)) {
      return next();
    }

    // Load centralized config once dynamically (<1ms memory cache, <30s TTL)
    const config = await systemSettingsService.getAppConfig();

    // ── 3. MAINTENANCE_MODE ───────────────────────────────────────────────────
    const inMaintenance = config.maintenanceMode;

    logger.info({
      source: 'global-route-guard',
      maintenanceMode: inMaintenance,
      readOnlyMode: config.readOnlyMode,
      path: rawPath,
      method,
      timestamp: new Date(),
    });

    if (inMaintenance) {
      return res.status(503).json({
        success:     false,
        maintenance: true,
        code:        "MAINTENANCE_MODE",
        message:     "FarmZY is currently under maintenance. Please try again later.",
      });
    }

    // ── 4. READ_ONLY_MODE ─────────────────────────────────────────────────────
    if (WRITE_METHODS.has(method)) {
      if (config.readOnlyMode) {
        return res.status(503).json({
          success:  false,
          readOnly: true,
          code:     "READ_ONLY_MODE",
          message:  "FarmZY is currently in read-only mode. No changes can be made at this time.",
        });
      }
    }

    // ── 5. DISABLE_REGISTRATIONS ──────────────────────────────────────────────
    if (isRegistrationPath(rawPath) && method === "POST") {
      const registrationsDisabled = await systemSettingsService.getBoolean(
        SystemSettingKey.DISABLE_REGISTRATIONS,
        false
      );

      if (registrationsDisabled) {
        return res.status(503).json({
          success: false,
          code:    "REGISTRATIONS_DISABLED",
          message: "New registrations are currently disabled. Please try again later.",
        });
      }
    }

    // ── 6. Per-route toggle ───────────────────────────────────────────────────
    const normalizedPath = normalizePath(rawPath);
    const routeEnabled   = await systemSettingsService.isRouteEnabled(method, normalizedPath);

    if (!routeEnabled) {
      return res.status(503).json({
        success: false,
        code:    "ROUTE_DISABLED",
        message: "This API endpoint is currently disabled.",
      });
    }

    next();
  } catch {
    // Guard must never block a valid request due to its own internal errors.
    next();
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function isAlwaysAllowed(path: string): boolean {
  if (MAINTENANCE_BYPASS_EXACT.includes(path)) return true;
  return MAINTENANCE_BYPASS_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function isRegistrationPath(path: string): boolean {
  return REGISTRATION_PATHS.some((p) => path.startsWith(p));
}

/**
 * Normalizes a path for consistent cache key lookup:
 * - Lowercase, no trailing slash
 * - UUIDs, cuid, and numeric IDs normalized to :id
 */
function normalizePath(path: string): string {
  return path
    .toLowerCase()
    .replace(/\/+$/, "")
    .replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      "/:id"
    )
    .replace(/\/c[a-z0-9]{24,}/g, "/:id")
    .replace(/\/\d+/g, "/:id");
}

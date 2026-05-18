import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { logger } from "../utils/logger";

let io: SocketIOServer | null = null;

/**
 * Initializes the Socket.IO server on top of the Express HTTP server instance.
 */
export function initSocketServer(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: "*", // Allows dynamic connection in dev/staging environment
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.on("connection", (socket) => {
    logger.info({
      event: "realtime_client_connected",
      socketId: socket.id,
      headers: {
        host: socket.handshake.headers.host,
        userAgent: socket.handshake.headers["user-agent"]
      }
    });

    socket.on("disconnect", (reason) => {
      logger.info({
        event: "realtime_client_disconnected",
        socketId: socket.id,
        reason
      });
    });
  });

  logger.info("🔌 Socket.IO Realtime engine successfully initialized.");
  return io;
}

/**
 * Retrieves the initialized Socket.IO server singleton instance.
 */
export function getSocketServer(): SocketIOServer | null {
  return io;
}

/**
 * Broadcasts a settings invalidation event to all active clients.
 */
export function emitSystemSettingsUpdated(payload: { version: number; updatedKeys: string[] }) {
  if (io) {
    const clientCount = io.engine.clientsCount;
    const start = performance.now();

    try {
      io.emit("system-settings-updated", payload);
      const duration = Math.round(performance.now() - start);

      logger.info({
        event: "emit_socket_settings_update",
        version: payload.version,
        updatedKeysCount: payload.updatedKeys.length,
        updatedKeys: payload.updatedKeys,
        affectedClients: clientCount,
        broadcastDurationMs: duration
      });

      // Log success event (Realtime Observability)
      const { systemSettingEventService } = require("../modules/system-settings/v1/system-setting-event.service");
      systemSettingEventService.logBroadcast({
        settingKeys: payload.updatedKeys,
        settingsVersion: payload.version,
        affectedClients: clientCount,
        broadcastDurationMs: duration,
        propagationStatus: "SUCCESS"
      }).catch((err: any) => {
        logger.error({ message: "Failed to log Socket broadcast success event", error: err.message });
      });

    } catch (err: any) {
      logger.error({
        message: "Failed to broadcast settings update via Socket.IO",
        error: err.message
      });

      // Log failure event (Realtime Observability)
      const { systemSettingEventService } = require("../modules/system-settings/v1/system-setting-event.service");
      systemSettingEventService.logSyncFailure({
        settingKeys: payload.updatedKeys,
        settingsVersion: payload.version,
        error: err.message
      }).catch((logErr: any) => {
        logger.error({ message: "Failed to log Socket broadcast failure event", error: logErr.message });
      });
    }
  } else {
    logger.warn({
      event: "emit_socket_settings_update_skipped",
      message: "Socket.IO server not initialized yet. Skipping realtime broadcast.",
      payload
    });

    // Log skip/failure due to uninitialized server
    try {
      const { systemSettingEventService } = require("../modules/system-settings/v1/system-setting-event.service");
      systemSettingEventService.logSyncFailure({
        settingKeys: payload.updatedKeys,
        settingsVersion: payload.version,
        error: "Socket.IO server not initialized"
      }).catch(() => {});
    } catch {}
  }
}

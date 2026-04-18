import { dispatchNotificationEmail } from "./notification.mapper";
import {
  NotificationEventType,
  NotificationPayload,
} from "./notification.types";

class NotificationService {
  private sanitizePayload(payload: NotificationPayload) {
    const metadata =
      payload.metadata && typeof payload.metadata === "object"
        ? {
            ...payload.metadata,
            ...(Object.prototype.hasOwnProperty.call(payload.metadata, "otp")
              ? { otp: "[REDACTED]" }
              : {}),
          }
        : payload.metadata;

    return {
      ...payload,
      metadata,
    };
  }

  async sendNotification(
    eventType: NotificationEventType,
    payload: NotificationPayload
  ) {
    try {
      await dispatchNotificationEmail(eventType, payload);
    } catch (error) {
      console.error("[notification] failed to send notification", {
        eventType,
        payload: this.sanitizePayload(payload),
        error,
      });
    }
  }
}

const notificationService = new NotificationService();

export default notificationService;

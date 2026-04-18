import { Broadcast, BroadcastType } from "@prisma/client";
import type {
  BroadcastResponse,
  BroadcastUiMeta,
} from "./broadcast.types";

const BROADCAST_UI_MAP: Record<BroadcastType, BroadcastUiMeta> = {
  UPDATE: {
    icon: "megaphone",
    color: "#4E6F3D",
    priority: 1,
    behavior: "FEED",
  },
  SUCCESS: {
    icon: "check-circle",
    color: "#2F855A",
    priority: 2,
    behavior: "HIGHLIGHTED_FEED",
  },
  IMPORTANT: {
    icon: "bell",
    color: "#7ED957",
    priority: 3,
    behavior: "BANNER",
  },
  MAINTENANCE: {
    icon: "wrench",
    color: "#D69E2E",
    priority: 4,
    behavior: "WARNING_BANNER",
  },
  ALERT: {
    icon: "alert-triangle",
    color: "#E53E3E",
    priority: 5,
    behavior: "POPUP",
  },
};

export const getBroadcastUiMeta = (type: BroadcastType) => BROADCAST_UI_MAP[type];

export const mapBroadcastToResponse = (
  broadcast: Broadcast
): BroadcastResponse => ({
  ...broadcast,
  ui: getBroadcastUiMeta(broadcast.type),
});

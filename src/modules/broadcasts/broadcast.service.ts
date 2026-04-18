import { BroadcastType, TargetAudience, UserRole } from "@prisma/client";
import ApiError from "../../utils/apiError";
import notificationService from "../notification/notification.service";
import { NotificationEventType } from "../notification/notification.types";
import { getBroadcastUiMeta, mapBroadcastToResponse } from "./broadcast.mapper";
import {
  createBroadcastRecord,
  findActiveBroadcastsForAudiences,
  findBroadcastById,
  findCompanyRecipientBatch,
  findDeliveryRecipientBatch,
  findUserRecipientBatch,
  listBroadcastRecords,
  softDeleteBroadcastRecord,
  updateBroadcastRecord,
} from "./broadcast.repository";
import type {
  BroadcastActor,
  BroadcastListFilters,
  BroadcastRecipient,
  CreateBroadcastInput,
  UpdateBroadcastInput,
} from "./broadcast.types";

const ALERT_EMAIL_BATCH_SIZE = 200;

const parseDateInput = (
  value: string | Date | null | undefined,
  fieldName: string
) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, `${fieldName} must be a valid datetime`);
  }

  return date;
};

const normalizeBroadcastInput = (
  input: CreateBroadcastInput | UpdateBroadcastInput,
  mode: "create" | "update"
) => {
  if (mode === "create" || input.type !== undefined) {
    if (!input.type || !Object.values(BroadcastType).includes(input.type)) {
      throw new ApiError(400, "type must be a valid BroadcastType");
    }
  }

  if (mode === "create" || input.targetAudience !== undefined) {
    if (
      !input.targetAudience ||
      !Object.values(TargetAudience).includes(input.targetAudience)
    ) {
      throw new ApiError(400, "targetAudience must be a valid TargetAudience");
    }
  }

  if (mode === "create" || input.title !== undefined) {
    if (!input.title || input.title.trim().length < 3) {
      throw new ApiError(400, "title must be at least 3 characters long");
    }
  }

  if (mode === "create" || input.message !== undefined) {
    if (!input.message || input.message.trim().length < 10) {
      throw new ApiError(400, "message must be at least 10 characters long");
    }
  }

  if (
    (input.ctaLabel && !input.ctaLink) ||
    (input.ctaLink && !input.ctaLabel)
  ) {
    throw new ApiError(400, "ctaLabel and ctaLink must be provided together");
  }

  const publishAt =
    parseDateInput(input.publishAt, "publishAt") ?? (mode === "create" ? new Date() : undefined);
  const expiresAt = parseDateInput(input.expiresAt, "expiresAt");

  if (publishAt && expiresAt && expiresAt <= publishAt) {
    throw new ApiError(400, "expiresAt must be later than publishAt");
  }

  return {
    ...input,
    publishAt,
    expiresAt,
    title: input.title?.trim(),
    message: input.message?.trim(),
    imageUrl: input.imageUrl?.trim() || null,
    ctaLabel: input.ctaLabel?.trim() || null,
    ctaLink: input.ctaLink?.trim() || null,
  };
};

const getActorAudience = (actor: BroadcastActor): TargetAudience[] => {
  if (actor.role === UserRole.ADMIN) {
    return [TargetAudience.ALL];
  }

  if (actor.role === UserRole.DELIVERY_PARTNER) {
    return [TargetAudience.ALL, TargetAudience.DELIVERY_PARTNER];
  }

  if (actor.actorType === "COMPANY" || actor.companyId) {
    return [TargetAudience.ALL, TargetAudience.COMPANY];
  }

  return [TargetAudience.ALL, TargetAudience.USER];
};

const sortByPriorityAndDate = <T extends { type: BroadcastType; createdAt: Date }>(
  broadcasts: T[]
) =>
  broadcasts.sort((left, right) => {
    const priorityDelta =
      getBroadcastUiMeta(right.type).priority - getBroadcastUiMeta(left.type).priority;

    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return right.createdAt.getTime() - left.createdAt.getTime();
  });

const buildBroadcastActions = (broadcast: {
  ctaLabel: string | null;
  ctaLink: string | null;
}) =>
  broadcast.ctaLabel && broadcast.ctaLink
    ? {
        actionLabel: broadcast.ctaLabel,
        actionHref: broadcast.ctaLink,
      }
    : {};

class BroadcastService {
  async createBroadcast(createdBy: string, input: CreateBroadcastInput) {
    const normalized = normalizeBroadcastInput(input, "create");
    const createData: CreateBroadcastInput & { createdBy: string } = {
      title: normalized.title!,
      message: normalized.message!,
      type: normalized.type!,
      targetAudience: normalized.targetAudience!,
      publishAt: normalized.publishAt ?? new Date(),
      expiresAt: normalized.expiresAt ?? null,
      isActive: normalized.isActive ?? true,
      imageUrl: normalized.imageUrl ?? null,
      ctaLabel: normalized.ctaLabel ?? null,
      ctaLink: normalized.ctaLink ?? null,
      createdBy,
    };
    const broadcast = await createBroadcastRecord({
      ...createData,
    });

    this.triggerSideEffects(broadcast);

    return mapBroadcastToResponse(broadcast);
  }

  async listBroadcasts(filters?: BroadcastListFilters) {
    const broadcasts = await listBroadcastRecords(filters);

    return broadcasts.map(mapBroadcastToResponse);
  }

  async updateBroadcast(id: string, input: UpdateBroadcastInput) {
    const existing = await findBroadcastById(id);

    if (!existing) {
      throw new ApiError(404, "Broadcast not found");
    }

    const normalized = normalizeBroadcastInput(
      {
        ...existing,
        ...input,
      },
      "update"
    );

    const broadcast = await updateBroadcastRecord(id, normalized);

    return mapBroadcastToResponse(broadcast);
  }

  async deleteBroadcast(id: string) {
    const existing = await findBroadcastById(id);

    if (!existing) {
      throw new ApiError(404, "Broadcast not found");
    }

    const broadcast = await softDeleteBroadcastRecord(id);

    return mapBroadcastToResponse(broadcast);
  }

  async getActiveBroadcasts(actor: BroadcastActor) {
    const now = new Date();
    const audiences = getActorAudience(actor);
    const broadcasts = await findActiveBroadcastsForAudiences(audiences, now);

    return sortByPriorityAndDate(broadcasts).map(mapBroadcastToResponse);
  }

  private triggerSideEffects(broadcast: Awaited<ReturnType<typeof createBroadcastRecord>>) {
    if (broadcast.type === BroadcastType.IMPORTANT) {
      setImmediate(() => {
        console.info("[broadcast] push dispatch queued", {
          broadcastId: broadcast.id,
          targetAudience: broadcast.targetAudience,
          type: broadcast.type,
        });
      });
    }

    if (broadcast.type === BroadcastType.ALERT) {
      setImmediate(() => {
        console.info("[broadcast] alert push dispatch queued", {
          broadcastId: broadcast.id,
          targetAudience: broadcast.targetAudience,
          type: broadcast.type,
        });
      });

      void this.dispatchAlertEmails(broadcast);
    }
  }

  private async dispatchAlertEmails(
    broadcast: Awaited<ReturnType<typeof createBroadcastRecord>>
  ) {
    const dispatchAudience = async (
      fetchBatch: (cursor?: string, take?: number) => Promise<BroadcastRecipient[]>
    ) => {
      let cursor: string | undefined;

      while (true) {
        const batch = await fetchBatch(cursor, ALERT_EMAIL_BATCH_SIZE);

        if (!batch.length) {
          break;
        }

        await Promise.allSettled(
          batch.map((recipient) =>
            notificationService.sendNotification(NotificationEventType.BROADCAST_ALERT, {
              ...(recipient.audience === TargetAudience.COMPANY
                ? {
                    company: {
                      id: recipient.id,
                      name: recipient.name,
                      email: recipient.email,
                    },
                  }
                : {
                    user: {
                      id: recipient.id,
                      name: recipient.name,
                      email: recipient.email,
                    },
                  }),
              metadata: {
                broadcastType: recipient.audience,
                title: broadcast.title,
                summary: broadcast.message,
                subject: `Farmzy alert: ${broadcast.title}`,
                reason: broadcast.message,
                ...buildBroadcastActions(broadcast),
              },
            })
          )
        );

        cursor = batch[batch.length - 1]?.id;

        if (batch.length < ALERT_EMAIL_BATCH_SIZE) {
          break;
        }
      }
    };

    try {
      switch (broadcast.targetAudience) {
        case TargetAudience.ALL:
          await dispatchAudience(findUserRecipientBatch);
          await dispatchAudience(findCompanyRecipientBatch);
          await dispatchAudience(findDeliveryRecipientBatch);
          break;
        case TargetAudience.USER:
          await dispatchAudience(findUserRecipientBatch);
          break;
        case TargetAudience.COMPANY:
          await dispatchAudience(findCompanyRecipientBatch);
          break;
        case TargetAudience.DELIVERY_PARTNER:
          await dispatchAudience(findDeliveryRecipientBatch);
          break;
      }
    } catch (error) {
      console.error("[broadcast] failed to dispatch alert emails", {
        broadcastId: broadcast.id,
        error,
      });
    }
  }
}

const broadcastService = new BroadcastService();

export default broadcastService;

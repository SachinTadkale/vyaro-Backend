import {
  AuditEntityType,
  DisputeStatus,
  PaymentStatus,
  Prisma,
  UserRole,
} from "@prisma/client";
import prisma from "../../config/prisma";
import ApiError from "../../utils/apiError";
import { createAuditLogs } from "./dispute.audit";
import {
  ACTIVE_DISPUTE_STATUSES,
  DISPUTE_BLOCKED_ORDER_STATUSES,
  DISPUTE_CREATION_PAYMENT_STATUSES,
  DISPUTE_RESOLUTION_ACTIONS,
  DisputeResolutionAction,
  MAX_DISPUTES_PER_ORDER,
} from "./dispute.constants";
import {
  countDisputesForOrder,
  countDisputesRaisedByActor,
  createDisputeRecord,
  findActiveDisputeByOrderId,
  findDisputeById,
  findOrderForDispute,
  updateDisputeToResolved,
  updateOrderAfterResolution,
  updateOrderToDisputed,
  updatePaymentAfterResolution,
  updatePaymentToFrozen,
} from "./dispute.repository";
import { CreateDisputeInput, ResolveDisputeInput } from "./dispute.schema";

type DisputeActor = {
  userId: string;
  role?: UserRole;
  companyId?: string;
  actorType?: "USER" | "COMPANY";
};

type DisputeRecord = NonNullable<Awaited<ReturnType<typeof findDisputeById>>>;

const formatDispute = (dispute: DisputeRecord) => ({
  id: dispute.id,
  orderId: dispute.orderId,
  raisedBy: dispute.raisedBy,
  raisedByActorType: dispute.raisedByActorType,
  reason: dispute.reason,
  description: dispute.description,
  status: dispute.status,
  resolutionNote: dispute.resolutionNote,
  createdAt: dispute.createdAt,
  resolvedAt: dispute.resolvedAt,
  resolvedBy: dispute.resolvedBy,
  order: {
    id: dispute.order.orderId,
    companyId: dispute.order.companyId,
    sellerId: dispute.order.sellerId,
    orderStatus: dispute.order.orderStatus,
    paymentStatus: dispute.order.paymentStatus,
    quantity: dispute.order.quantity,
    finalPrice: dispute.order.finalPrice,
    product: {
      name: dispute.order.productName,
      category: dispute.order.productCategory,
      unit: dispute.order.productUnit,
    },
    company: dispute.order.company,
  },
  payment: dispute.order.payment
    ? {
        id: dispute.order.payment.paymentId,
        status: dispute.order.payment.status,
        amount: dispute.order.payment.amount,
        currency: dispute.order.payment.currency,
        heldAt: dispute.order.payment.heldAt,
        releasedAt: dispute.order.payment.releasedAt,
      }
    : null,
});

const isAdmin = (actor: DisputeActor) => actor.role === UserRole.ADMIN;

const isActiveDisputeStatus = (status: DisputeStatus) =>
  ACTIVE_DISPUTE_STATUSES.some((activeStatus) => activeStatus === status);

const assertActorCanAccessOrder = (
  actor: DisputeActor,
  order: NonNullable<Awaited<ReturnType<typeof findOrderForDispute>>>,
) => {
  if (isAdmin(actor)) {
    return;
  }

  const isCompanyActor =
    actor.actorType === "COMPANY" &&
    actor.companyId &&
    actor.companyId === order.companyId;
  const isFarmerActor =
    actor.actorType === "USER" && actor.userId === order.sellerId;

  if (!isCompanyActor && !isFarmerActor) {
    throw new ApiError(403, "Unauthorized", {
      code: "UNAUTHORIZED",
    });
  }
};

const assertDisputeCreationEligible = (
  order: NonNullable<Awaited<ReturnType<typeof findOrderForDispute>>>,
) => {
  if (DISPUTE_BLOCKED_ORDER_STATUSES.has(order.orderStatus)) {
    throw new ApiError(409, "Dispute cannot be created for a settled order", {
      code: "INVALID_PAYMENT_STATE",
      details: {
        orderStatus: order.orderStatus,
      },
    });
  }

  if (!order.payment) {
    throw new ApiError(409, "Payment is not eligible for dispute", {
      code: "INVALID_PAYMENT_STATE",
    });
  }

  if (!DISPUTE_CREATION_PAYMENT_STATUSES.has(order.payment.status)) {
    throw new ApiError(409, "Payment is not eligible for dispute", {
      code: "INVALID_PAYMENT_STATE",
      details: {
        paymentStatus: order.payment.status,
      },
    });
  }
};

const toResolutionPaymentStatus = (
  resolutionAction: DisputeResolutionAction,
) => {
  if (resolutionAction === DISPUTE_RESOLUTION_ACTIONS[0]) {
    return PaymentStatus.RELEASED;
  }

  return PaymentStatus.REFUNDED;
};

export const createDispute = async (
  actor: DisputeActor,
  input: CreateDisputeInput,
) => {
  const order = await findOrderForDispute(input.orderId);

  if (!order) {
    throw new ApiError(404, "Order not found", {
      code: "ORDER_NOT_FOUND",
    });
  }

  assertActorCanAccessOrder(actor, order);
  assertDisputeCreationEligible(order);

  const totalDisputesForOrder = await countDisputesForOrder(input.orderId);
  if (totalDisputesForOrder >= MAX_DISPUTES_PER_ORDER) {
    throw new ApiError(429, "Dispute limit reached for this order", {
      code: "DISPUTE_LIMIT_REACHED",
    });
  }

  const activeDispute = await findActiveDisputeByOrderId(input.orderId);
  if (activeDispute) {
    throw new ApiError(409, "An active dispute already exists for this order", {
      code: "DISPUTE_ALREADY_EXISTS",
    });
  }

  const raisedBy = actor.companyId ?? actor.userId;
  const raisedByActorType = actor.actorType ?? "USER";
  const priorDisputesByActor = await countDisputesRaisedByActor(
    raisedBy,
    raisedByActorType,
  );

  const dispute = await prisma.$transaction(async (tx) => {
    const createdDispute = await createDisputeRecord(
      {
        orderId: input.orderId,
        raisedBy,
        raisedByActorType,
        reason: input.reason,
        description: input.description,
      },
      tx,
    );

    const payment = await updatePaymentToFrozen(input.orderId, tx);
    await updateOrderToDisputed(input.orderId, tx);

    await createAuditLogs(tx, [
      {
        entityType: AuditEntityType.DISPUTE,
        entityId: createdDispute.id,
        action: "CREATED",
        performedBy: raisedBy,
        metadata: {
          orderId: input.orderId,
          reason: input.reason,
          raisedByActorType,
          priorDisputesByActor,
          totalDisputesForOrder,
        } satisfies Prisma.InputJsonValue,
      },
      {
        entityType: AuditEntityType.PAYMENT,
        entityId: payment.paymentId,
        action: "PAYMENT_FROZEN",
        performedBy: raisedBy,
        metadata: {
          orderId: input.orderId,
          paymentStatus: payment.status,
          disputeId: createdDispute.id,
        } satisfies Prisma.InputJsonValue,
      },
    ]);

    return (await findDisputeById(createdDispute.id, tx))!;
  });

  return formatDispute(dispute);
};

export const getDispute = async (actor: DisputeActor, disputeId: string) => {
  const dispute = await findDisputeById(disputeId);

  if (!dispute) {
    throw new ApiError(404, "Dispute not found", {
      code: "DISPUTE_NOT_FOUND",
    });
  }

  assertActorCanAccessOrder(actor, dispute.order);

  return formatDispute(dispute);
};

export const resolveDispute = async (
  actor: DisputeActor,
  disputeId: string,
  input: ResolveDisputeInput,
) => {
  if (!isAdmin(actor)) {
    throw new ApiError(403, "Unauthorized", {
      code: "UNAUTHORIZED",
    });
  }

  const dispute = await findDisputeById(disputeId);

  if (!dispute) {
    throw new ApiError(404, "Dispute not found", {
      code: "DISPUTE_NOT_FOUND",
    });
  }

  if (!isActiveDisputeStatus(dispute.status)) {
    throw new ApiError(409, "Dispute cannot be resolved from its current state", {
      code: "INVALID_RESOLUTION",
      details: {
        status: dispute.status,
      },
    });
  }

  if (!dispute.order.payment) {
    throw new ApiError(409, "Payment is not eligible for resolution", {
      code: "INVALID_PAYMENT_STATE",
    });
  }

  const paymentStatus = toResolutionPaymentStatus(input.resolutionAction);
  const performedBy = actor.userId;

  const resolvedDispute = await prisma.$transaction(async (tx) => {
    const payment = await updatePaymentAfterResolution(
      {
        orderId: dispute.orderId,
        status: paymentStatus,
      },
      tx,
    );

    await updateOrderAfterResolution(
      {
        orderId: dispute.orderId,
        paymentStatus,
      },
      tx,
    );

    const updatedDispute = await updateDisputeToResolved(
      {
        id: disputeId,
        status: DisputeStatus.RESOLVED,
        resolvedBy: performedBy,
        resolutionNote: input.resolutionNote,
      },
      tx,
    );

    await createAuditLogs(tx, [
      {
        entityType: AuditEntityType.DISPUTE,
        entityId: updatedDispute.id,
        action: "RESOLVED",
        performedBy,
        metadata: {
          orderId: dispute.orderId,
          resolutionAction: input.resolutionAction,
          resolutionNote: input.resolutionNote,
        } satisfies Prisma.InputJsonValue,
      },
      {
        entityType: AuditEntityType.PAYMENT,
        entityId: payment.paymentId,
        action:
          payment.status === PaymentStatus.RELEASED ? "RELEASED" : "REFUNDED",
        performedBy,
        metadata: {
          orderId: dispute.orderId,
          disputeId,
          paymentStatus: payment.status,
        } satisfies Prisma.InputJsonValue,
      },
    ]);

    return (await findDisputeById(updatedDispute.id, tx))!;
  });

  return formatDispute(resolvedDispute);
};

import {
  DisputeStatus,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from "@prisma/client";
import prisma from "../../config/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

export const disputeDetailsSelect = {
  id: true,
  orderId: true,
  raisedBy: true,
  raisedByActorType: true,
  reason: true,
  description: true,
  status: true,
  resolutionNote: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  resolvedBy: true,
  order: {
    select: {
      orderId: true,
      companyId: true,
      sellerId: true,
      orderStatus: true,
      paymentStatus: true,
      quantity: true,
      finalPrice: true,
      productName: true,
      productCategory: true,
      productUnit: true,
      company: {
        select: {
          companyId: true,
          companyName: true,
          email: true,
        },
      },
      payment: {
        select: {
          paymentId: true,
          status: true,
          amount: true,
          currency: true,
          heldAt: true,
          releasedAt: true,
        },
      },
    },
  },
} satisfies Prisma.DisputeSelect;

export const disputeOrderContextSelect = {
  orderId: true,
  companyId: true,
  sellerId: true,
  orderStatus: true,
  paymentStatus: true,
  quantity: true,
  finalPrice: true,
  productName: true,
  productCategory: true,
  productUnit: true,
  payment: {
    select: {
      paymentId: true,
      status: true,
      amount: true,
      currency: true,
      heldAt: true,
      releasedAt: true,
    },
  },
} satisfies Prisma.OrderSelect;

export type DisputeDetailsRecord = Prisma.DisputeGetPayload<{
  select: typeof disputeDetailsSelect;
}>;

export type DisputeOrderContext = Prisma.OrderGetPayload<{
  select: typeof disputeOrderContextSelect;
}>;

const getDb = (db?: DbClient) => db ?? prisma;

export const findOrderForDispute = (orderId: string, db?: DbClient) =>
  getDb(db).order.findUnique({
    where: { orderId },
    select: disputeOrderContextSelect,
  });

export const countDisputesForOrder = (orderId: string, db?: DbClient) =>
  getDb(db).dispute.count({
    where: { orderId },
  });

export const countDisputesRaisedByActor = (
  raisedBy: string,
  raisedByActorType: string,
  db?: DbClient,
) =>
  getDb(db).dispute.count({
    where: {
      raisedBy,
      raisedByActorType,
    },
  });

export const findActiveDisputeByOrderId = (orderId: string, db?: DbClient) =>
  getDb(db).dispute.findFirst({
    where: {
      orderId,
      status: {
        in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW],
      },
    },
    select: disputeDetailsSelect,
  });

export const createDisputeRecord = (
  data: {
    orderId: string;
    raisedBy: string;
    raisedByActorType: string;
    reason: string;
    description: string;
  },
  db?: DbClient,
) =>
  getDb(db).dispute.create({
    data,
    select: disputeDetailsSelect,
  });

export const updatePaymentToFrozen = (orderId: string, db?: DbClient) =>
  getDb(db).payment.update({
    where: { orderId },
    data: {
      status: PaymentStatus.FROZEN,
    },
    select: {
      paymentId: true,
      orderId: true,
      status: true,
    },
  });

export const updateOrderToDisputed = (orderId: string, db?: DbClient) =>
  getDb(db).order.update({
    where: { orderId },
    data: {
      orderStatus: OrderStatus.DISPUTED,
      paymentStatus: PaymentStatus.FROZEN,
    },
    select: {
      orderId: true,
      orderStatus: true,
      paymentStatus: true,
    },
  });

export const findDisputeById = (id: string, db?: DbClient) =>
  getDb(db).dispute.findUnique({
    where: { id },
    select: disputeDetailsSelect,
  });

export const updateDisputeToResolved = (
  params: {
    id: string;
    status: DisputeStatus;
    resolvedBy: string;
    resolutionNote: string;
  },
  db?: DbClient,
) =>
  getDb(db).dispute.update({
    where: { id: params.id },
    data: {
      status: params.status,
      resolvedBy: params.resolvedBy,
      resolvedAt: new Date(),
      resolutionNote: params.resolutionNote,
    },
    select: disputeDetailsSelect,
  });

export const updatePaymentAfterResolution = (
  params: {
    orderId: string;
    status: PaymentStatus;
  },
  db?: DbClient,
) =>
  getDb(db).payment.update({
    where: { orderId: params.orderId },
    data: {
      status: params.status,
      releasedAt: params.status === PaymentStatus.RELEASED ? new Date() : null,
      releaseMode:
        params.status === PaymentStatus.RELEASED
          ? "DISPUTE_RESOLUTION"
          : null,
      releaseReference:
        params.status === PaymentStatus.RELEASED
          ? `dispute_release_${Date.now()}`
          : `dispute_refund_${Date.now()}`,
    },
    select: {
      paymentId: true,
      orderId: true,
      status: true,
    },
  });

export const updateOrderAfterResolution = (
  params: {
    orderId: string;
    paymentStatus: PaymentStatus;
  },
  db?: DbClient,
) =>
  getDb(db).order.update({
    where: { orderId: params.orderId },
    data: {
      orderStatus:
        params.paymentStatus === PaymentStatus.RELEASED
          ? OrderStatus.COMPLETED
          : OrderStatus.CANCELLED,
      paymentStatus: params.paymentStatus,
    },
    select: {
      orderId: true,
      orderStatus: true,
      paymentStatus: true,
    },
  });

import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import prisma from "../../config/prisma";

export const paymentContextSelect = {
  orderId: true,
  companyId: true,
  sellerId: true,
  finalPrice: true,
  orderStatus: true,
  paymentStatus: true,
  productName: true,
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
      amount: true,
      amountInPaise: true,
      currency: true,
      status: true,
      method: true,
      receipt: true,
      idempotencyKey: true,
      failureReason: true,
      releaseMode: true,
      releaseReference: true,
      razorpayOrderId: true,
      razorpayPaymentId: true,
      razorpaySignature: true,
      heldAt: true,
      releasedAt: true,
      failedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.OrderSelect;

export const paymentDetailsSelect = {
  paymentId: true,
  orderId: true,
  companyId: true,
  userId: true,

  amount: true,
  amountInPaise: true,
  currency: true,

  status: true,
  method: true,
  receipt: true,
  idempotencyKey: true,
  failureReason: true,

  releaseMode: true,
  releaseReference: true,

  razorpayOrderId: true,
  razorpayPaymentId: true,
  razorpaySignature: true,

  initiatedAt: true,
  paidAt: true,
  heldAt: true,
  releasedAt: true,
  failedAt: true,

  createdAt: true,
  updatedAt: true,

  // 🔹 ORDER DETAILS (with delivery + fees)
  order: {
    select: {
      orderId: true,
      sellerId: true,
      companyId: true,

      finalPrice: true,
      quantity: true,
      unitPrice: true,

      productName: true,
      productCategory: true,
      productUnit: true,

      orderStatus: true,
      paymentStatus: true,

      // ✅ NEW (required for transaction logic)
      deliveryFee: true,
      platformFee: true,

      // ✅ DELIVERY (required for delivery payout)
      delivery: {
        select: {
          partnerId: true,
          status: true,
        },
      },

      company: {
        select: {
          companyId: true,
          companyName: true,
          email: true,
        },
      },
    },
  },

  // 🔹 USER (FARMER)
  user: {
    select: {
      user_id: true,
      name: true,
      phone_no: true,
      email: true,

      bankDetails: {
        select: {
          id: true,
          accountHolder: true,
          bankName: true,
          accountNumberLast4: true,
          ifscLast4: true,
        },
      },
    },
  },

  // 🔹 TRANSACTIONS (LEDGER - FINAL STRUCTURE)
  transactions: {
    select: {
      transactionId: true,
      paymentId: true,
      orderId: true,

      userId: true,
      companyId: true,
      actorType: true,

      amount: true,
      amountInPaise: true,

      type: true,
      direction: true,
      status: true,

      isEscrow: true,
      createdAt: true,
    },
  },
} satisfies Prisma.PaymentSelect;

export const findOrderForPaymentByCompany = (
  orderId: string,
  companyId: string,
) =>
  prisma.order.findFirst({
    where: { orderId, companyId },
    select: paymentContextSelect,
  });

export const findPaymentByOrderId = (orderId: string) =>
  prisma.payment.findUnique({
    where: { orderId },
    select: paymentDetailsSelect,
  });

export const findPaymentByOrderIdForCompany = (
  orderId: string,
  companyId: string,
) =>
  prisma.payment.findFirst({
    where: { orderId, companyId },
    select: paymentDetailsSelect,
  });

export const findPaymentByRazorpayOrderId = (razorpayOrderId: string) =>
  prisma.payment.findFirst({
    where: { razorpayOrderId },
    select: paymentDetailsSelect,
  });

export const findPaymentByRazorpayPaymentId = (razorpayPaymentId: string) =>
  prisma.payment.findFirst({
    where: { razorpayPaymentId },
    select: paymentDetailsSelect,
  });

export const createOrReuseInitiatedPayment = async ({
  order,
  amount,
  amountInPaise,
  currency,
  receipt,
  idempotencyKey,
  razorpayOrderId,
}: {
  order: Prisma.OrderGetPayload<{ select: typeof paymentContextSelect }>;
  amount: number;
  amountInPaise: number;
  currency: string;
  receipt: string;
  idempotencyKey?: string;
  razorpayOrderId: string;
}) =>
  prisma.payment.upsert({
    where: { orderId: order.orderId },
    update: {
      amount,
      amountInPaise,
      currency,
      status: PaymentStatus.INITIATED,
      receipt,
      idempotencyKey,
      razorpayOrderId,
      failureReason: null,
      releaseMode: null,
      releaseReference: null,
      failedAt: null,
      initiatedAt: new Date(),
      notes: {
        orderStatusAtInitiation: order.orderStatus,
      },
    },
    create: {
      orderId: order.orderId,
      companyId: order.companyId,
      userId: order.sellerId,
      amount,
      amountInPaise,
      currency,
      status: PaymentStatus.INITIATED,
      receipt,
      idempotencyKey,
      razorpayOrderId,
      initiatedAt: new Date(),
      notes: {
        orderStatusAtInitiation: order.orderStatus,
      },
    },
    select: paymentDetailsSelect,
  });

export const markPaymentVerifiedAndHeld = async ({
  orderId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  method,
}: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  method?: string;
}) =>
  prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { orderId },
      select: {
        paymentId: true,
        status: true,
      },
    });

    if (!payment) {
      return null;
    }

    if (
      payment.status === PaymentStatus.HELD ||
      payment.status === PaymentStatus.ESCROWED ||
      payment.status === PaymentStatus.FROZEN ||
      payment.status === PaymentStatus.RELEASED
    ) {
      return tx.payment.findUnique({
        where: { orderId },
        select: paymentDetailsSelect,
      });
    }

    await tx.payment.update({
      where: { orderId },
      data: {
        status: PaymentStatus.ESCROWED,
        method,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        paidAt: new Date(),
        heldAt: new Date(),
        failureReason: null,
      },
    });

    await tx.order.update({
      where: { orderId },
      data: {
        orderStatus: OrderStatus.CONFIRMED,
        paymentStatus: PaymentStatus.ESCROWED,
      },
    });

    return tx.payment.findUnique({
      where: { orderId },
      select: paymentDetailsSelect,
    });
  });

export const markPaymentFailed = async ({
  orderId,
  failureReason,
}: {
  orderId: string;
  failureReason: string;
}) =>
  prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { orderId },
      data: {
        status: PaymentStatus.FAILED,
        failureReason,
        failedAt: new Date(),
      },
    });

    await tx.order.update({
      where: { orderId },
      data: {
        paymentStatus: PaymentStatus.FAILED,
      },
    });
  });

export const storeWebhookEventIfNew = async ({
  eventId,
  eventType,
  paymentId,
  orderId,
  payload,
}: {
  eventId: string;
  eventType: string;
  paymentId?: string;
  orderId?: string;
  payload: Prisma.InputJsonValue;
}) => {
  try {
    await prisma.paymentWebhookEvent.create({
      data: {
        eventId,
        eventType,
        paymentId,
        orderId,
        payload,
      },
    });

    return true;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return false;
    }

    throw error;
  }
};

export const releasePaymentToFarmer = async ({
  orderId,
  releaseMode,
  releaseReference,
}: {
  orderId: string;
  releaseMode: string;
  releaseReference: string;
}) =>
  prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { orderId },
      select: {
        paymentId: true,
        userId: true,
        status: true,
      },
    });

    if (!payment) {
      return null;
    }

    const bankDetails = await tx.bankDetails.findUnique({
      where: { userId: payment.userId },
      select: {
        id: true,
      },
    });

    if (!bankDetails) {
      return { error: "BANK_DETAILS_NOT_FOUND" } as const;
    }

    if (payment.status === PaymentStatus.RELEASED) {
      return tx.payment.findUnique({
        where: { orderId },
        select: paymentDetailsSelect,
      });
    }

    await tx.payment.update({
      where: { orderId },
      data: {
        status: PaymentStatus.RELEASED,
        releaseMode,
        releaseReference,
        releasedAt: new Date(),
      },
    });

    await tx.order.update({
      where: { orderId },
      data: {
        orderStatus: OrderStatus.COMPLETED,
        paymentStatus: PaymentStatus.RELEASED,
      },
    });

    return tx.payment.findUnique({
      where: { orderId },
      select: paymentDetailsSelect,
    });
  });

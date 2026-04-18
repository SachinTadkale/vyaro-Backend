import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import type { NotificationPayload } from "../notification/notification.types";

export type RazorpayOrderResponse = {
  id: string;
  entity: "order";
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: "created" | "attempted" | "paid";
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
};

export type RazorpayTransferResponse = {
  id: string;
  entity: "transfer";
  amount: number;
  currency: string;
  recipient: string;
  status: string;
};

export type CreatePaymentOrderResult = {
  paymentId: string;
  orderId: string;
  razorpayOrderId: string;
  amount: number;
  amountInPaise: number;
  currency: string;
  keyId: string;
  status: PaymentStatus;
  receipt: string | null;
  isExistingOrder: boolean;
  notificationPayload?: NotificationPayload;
};

export type VerifyPaymentResult = {
  paymentId: string;
  orderId: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  razorpayPaymentId: string | null;
  heldAt: Date | null;
  notificationPayload?: NotificationPayload;
};

export type ReleasePaymentResult = {
  paymentId: string;
  orderId: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  releaseMode: string | null;
  releaseReference: string | null;
  releasedAt: Date | null;
  notificationPayload?: NotificationPayload;
};

export type PaymentContextRecord = Prisma.OrderGetPayload<{
  select: {
    orderId: true;
    companyId: true;
    sellerId: true;
    finalPrice: true;
    orderStatus: true;
    paymentStatus: true;
    productName: true;
    productUnit: true;
    company: {
      select: {
        companyId: true;
        companyName: true;
        email: true;
      };
    };
    payment: {
      select: {
        paymentId: true;
        amount: true;
        amountInPaise: true;
        currency: true;
        status: true;
        method: true;
        receipt: true;
        idempotencyKey: true;
        failureReason: true;
        releaseMode: true;
        releaseReference: true;
        razorpayOrderId: true;
        razorpayPaymentId: true;
        razorpaySignature: true;
        heldAt: true;
        releasedAt: true;
        failedAt: true;
        createdAt: true;
        updatedAt: true;
      };
    };
  };
}>;

export type PaymentDetailsRecord = Prisma.PaymentGetPayload<{
  select: {
    paymentId: true;
    orderId: true;
    companyId: true;
    userId: true;
    amount: true;
    amountInPaise: true;
    currency: true;
    status: true;
    method: true;
    receipt: true;
    idempotencyKey: true;
    failureReason: true;
    releaseMode: true;
    releaseReference: true;
    razorpayOrderId: true;
    razorpayPaymentId: true;
    razorpaySignature: true;
    initiatedAt: true;
    paidAt: true;
    heldAt: true;
    releasedAt: true;
    failedAt: true;
    createdAt: true;
    updatedAt: true;
    order: {
      select: {
        orderId: true;
        sellerId: true;
        companyId: true;
        finalPrice: true;
        quantity: true;
        unitPrice: true;
        productName: true;
        productCategory: true;
        productUnit: true;
        orderStatus: true;
        paymentStatus: true;
        company: {
          select: {
            companyId: true;
            companyName: true;
            email: true;
          };
        };
      };
    };
    user: {
      select: {
        user_id: true;
        name: true;
        phone_no: true;
        email: true;
        bankDetails: {
          select: {
            id: true;
            accountHolder: true;
            bankName: true;
            accountNumberLast4: true;
            ifscLast4: true;
          };
        };
      };
    };
    transactions: {
      select: {
        transactionId: true;
        paymentId: true;
        orderId: true;
        userId: true;
        companyId: true;
        actorType: true;

        amount: true;
        amountInPaise: true;

        type: true;
        direction: true;
        status: true;

        isEscrow: true;
        createdAt: true;
      };
    };
  };
}>;

export type RazorpayWebhookEnvelope = {
  entity: string;
  account_id?: string;
  event: string;
  contains: string[];
  payload: Record<string, any>;
  created_at: number;
};

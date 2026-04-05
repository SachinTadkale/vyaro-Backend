ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'CONFIRMED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PAID';

ALTER TABLE "Payment"
ADD COLUMN "amount" DOUBLE PRECISION,
ADD COLUMN "amountInPaise" INTEGER,
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN "status" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
ADD COLUMN "method" TEXT,
ADD COLUMN "receipt" TEXT,
ADD COLUMN "idempotencyKey" TEXT,
ADD COLUMN "failureReason" TEXT,
ADD COLUMN "releaseMode" TEXT,
ADD COLUMN "releaseReference" TEXT,
ADD COLUMN "razorpayOrderId" TEXT,
ADD COLUMN "razorpayPaymentId" TEXT,
ADD COLUMN "razorpaySignature" TEXT,
ADD COLUMN "initiatedAt" TIMESTAMP(3),
ADD COLUMN "paidAt" TIMESTAMP(3),
ADD COLUMN "heldAt" TIMESTAMP(3),
ADD COLUMN "failedAt" TIMESTAMP(3),
ADD COLUMN "notes" JSONB;

UPDATE "Payment"
SET
  "amount" = COALESCE("grossAmount", 0),
  "amountInPaise" = ROUND(COALESCE("grossAmount", 0) * 100),
  "status" = CASE
    WHEN "paymentStatus" = 'SUCCESS' THEN 'HELD'::"PaymentStatus"
    ELSE COALESCE("paymentStatus", 'INITIATED'::"PaymentStatus")
  END,
  "razorpayOrderId" = "gatewayOrderId",
  "razorpayPaymentId" = "gatewayPaymentId",
  "razorpaySignature" = "signature",
  "heldAt" = "confirmedAt",
  "releasedAt" = "releasedAt",
  "failedAt" = CASE WHEN "paymentStatus" = 'FAILED' THEN NOW() ELSE NULL END,
  "notes" = jsonb_build_object(
    'legacyPlatformFee', "platformFee",
    'legacyNetAmount', "netAmount",
    'legacyBankReferenceNo', "bankReferenceNo",
    'legacyProofUrl', "proofUrl",
    'legacyReportedAt', "reportedAt"
  );

ALTER TABLE "Payment"
ALTER COLUMN "amount" SET NOT NULL,
ALTER COLUMN "amountInPaise" SET NOT NULL;

ALTER TABLE "Payment"
DROP COLUMN "grossAmount",
DROP COLUMN "platformFee",
DROP COLUMN "netAmount",
DROP COLUMN "paymentStatus",
DROP COLUMN "bankReferenceNo",
DROP COLUMN "proofUrl",
DROP COLUMN "gatewayOrderId",
DROP COLUMN "gatewayPaymentId",
DROP COLUMN "signature",
DROP COLUMN "reportedAt",
DROP COLUMN "confirmedAt";

CREATE UNIQUE INDEX "Payment_razorpayOrderId_key" ON "Payment"("razorpayOrderId");
CREATE UNIQUE INDEX "Payment_razorpayPaymentId_key" ON "Payment"("razorpayPaymentId");
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");

CREATE TABLE "PaymentWebhookEvent" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "paymentId" TEXT,
  "orderId" TEXT,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentWebhookEvent_eventId_key" ON "PaymentWebhookEvent"("eventId");
CREATE INDEX "PaymentWebhookEvent_paymentId_idx" ON "PaymentWebhookEvent"("paymentId");
CREATE INDEX "PaymentWebhookEvent_orderId_idx" ON "PaymentWebhookEvent"("orderId");
CREATE INDEX "PaymentWebhookEvent_eventType_createdAt_idx" ON "PaymentWebhookEvent"("eventType", "createdAt");

ALTER TABLE "PaymentWebhookEvent"
ADD CONSTRAINT "PaymentWebhookEvent_paymentId_fkey"
FOREIGN KEY ("paymentId") REFERENCES "Payment"("paymentId") ON DELETE SET NULL ON UPDATE CASCADE;

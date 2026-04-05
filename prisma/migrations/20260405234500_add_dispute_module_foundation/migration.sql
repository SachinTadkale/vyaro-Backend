ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'ESCROWED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'FROZEN';

DO $$
BEGIN
  CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AuditEntityType" AS ENUM ('DISPUTE', 'PAYMENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

UPDATE "Payment"
SET "status" = 'ESCROWED'::"PaymentStatus"
WHERE "status" IN ('HELD', 'SUCCESS');

UPDATE "Order"
SET "paymentStatus" = 'ESCROWED'::"PaymentStatus"
WHERE "paymentStatus" IN ('HELD', 'SUCCESS');

ALTER TABLE "Dispute" RENAME COLUMN "disputeId" TO "id";

ALTER TABLE "Dispute"
ADD COLUMN IF NOT EXISTS "raisedByActorType" TEXT,
ADD COLUMN IF NOT EXISTS "description" TEXT,
ADD COLUMN IF NOT EXISTS "resolutionNote" TEXT,
ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "resolvedBy" TEXT;

UPDATE "Dispute"
SET
  "raisedByActorType" = COALESCE("raisedByActorType", 'USER'),
  "description" = COALESCE("description", 'Legacy dispute migrated without description');

ALTER TABLE "Dispute"
ALTER COLUMN "raisedByActorType" SET NOT NULL,
ALTER COLUMN "description" SET NOT NULL;

ALTER TABLE "Dispute"
ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Dispute"
ALTER COLUMN "status"
TYPE "DisputeStatus"
USING (
  CASE
    WHEN UPPER("status") = 'UNDER_REVIEW' THEN 'UNDER_REVIEW'::"DisputeStatus"
    WHEN UPPER("status") = 'RESOLVED' THEN 'RESOLVED'::"DisputeStatus"
    WHEN UPPER("status") = 'REJECTED' THEN 'REJECTED'::"DisputeStatus"
    ELSE 'OPEN'::"DisputeStatus"
  END
);

ALTER TABLE "Dispute"
ALTER COLUMN "status" SET DEFAULT 'OPEN',
ALTER COLUMN "status" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Dispute_status_idx" ON "Dispute"("status");

DROP INDEX IF EXISTS "Dispute_active_unique_idx";
CREATE UNIQUE INDEX "Dispute_active_unique_idx"
ON "Dispute"("orderId")
WHERE "status" IN ('OPEN', 'UNDER_REVIEW');

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT NOT NULL,
  "entityType" "AuditEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "performedBy" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_createdAt_idx"
ON "AuditLog"("entityType", "entityId", "createdAt");

CREATE INDEX IF NOT EXISTS "AuditLog_performedBy_createdAt_idx"
ON "AuditLog"("performedBy", "createdAt");

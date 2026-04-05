ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

CREATE INDEX IF NOT EXISTS "Delivery_partnerId_idx" ON "Delivery"("partnerId");
CREATE INDEX IF NOT EXISTS "Delivery_status_idx" ON "Delivery"("status");
CREATE INDEX IF NOT EXISTS "Delivery_partnerId_status_idx" ON "Delivery"("partnerId", "status");

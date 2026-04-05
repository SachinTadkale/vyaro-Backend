ALTER TABLE "DeliveryPartner"
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "DeliveryPartner_isAvailable_idx"
ON "DeliveryPartner"("isAvailable");

CREATE INDEX IF NOT EXISTS "DeliveryPartner_isAvailable_isActive_idx"
ON "DeliveryPartner"("isAvailable", "isActive");

CREATE OR REPLACE FUNCTION enforce_delivery_partner_user_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "User"
    WHERE "user_id" = NEW."userId"
      AND "role" = 'DELIVERY_PARTNER'
  ) THEN
    RAISE EXCEPTION 'DeliveryPartner profile requires a user with DELIVERY_PARTNER role';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS delivery_partner_user_role_guard ON "DeliveryPartner";

CREATE TRIGGER delivery_partner_user_role_guard
BEFORE INSERT OR UPDATE OF "userId"
ON "DeliveryPartner"
FOR EACH ROW
EXECUTE FUNCTION enforce_delivery_partner_user_role();

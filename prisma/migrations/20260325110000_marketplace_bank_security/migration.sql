-- Product comparison should normalize at query time, not through stored lowercase columns.
ALTER TABLE "Product"
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DROP INDEX IF EXISTS "Product_userId_productName_key";
CREATE UNIQUE INDEX "Product_name_category_normalized_key"
  ON "Product" (
    lower(regexp_replace(trim("productName"), '\s+', ' ', 'g')),
    lower(regexp_replace(trim("category"), '\s+', ' ', 'g'))
  );
CREATE INDEX "Product_name_normalized_idx"
  ON "Product" (lower(regexp_replace(trim("productName"), '\s+', ' ', 'g')));

-- Bank details encryption columns.
-- Existing plaintext rows must be re-written through the application or a one-off backfill script
-- that uses the runtime BANK_DETAILS_ENCRYPTION_KEY before dropping old columns in production.
ALTER TABLE "BankDetails"
ADD COLUMN "accountNumberEncrypted" TEXT,
ADD COLUMN "accountNumberIV" TEXT,
ADD COLUMN "accountNumberLast4" TEXT,
ADD COLUMN "ifscEncrypted" TEXT,
ADD COLUMN "ifscIV" TEXT,
ADD COLUMN "ifscLast4" TEXT;

UPDATE "BankDetails"
SET
  "accountNumberLast4" = right("accountNumber", 4),
  "ifscLast4" = right("ifsc", 4)
WHERE "accountNumber" IS NOT NULL
  AND "ifsc" IS NOT NULL;

-- After legacy rows are backfilled with encrypted values, run the following in a follow-up migration:
-- ALTER TABLE "BankDetails"
--   ALTER COLUMN "accountNumberEncrypted" SET NOT NULL,
--   ALTER COLUMN "accountNumberIV" SET NOT NULL,
--   ALTER COLUMN "accountNumberLast4" SET NOT NULL,
--   ALTER COLUMN "ifscEncrypted" SET NOT NULL,
--   ALTER COLUMN "ifscIV" SET NOT NULL,
--   ALTER COLUMN "ifscLast4" SET NOT NULL;
-- ALTER TABLE "BankDetails" DROP COLUMN "accountNumber", DROP COLUMN "ifsc";
-- CREATE UNIQUE INDEX "BankDetails_userId_key" ON "BankDetails"("userId");

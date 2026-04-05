ALTER TABLE "Order"
ADD COLUMN "sellerId" TEXT NOT NULL DEFAULT '',
ADD COLUMN "productId" TEXT NOT NULL DEFAULT '',
ADD COLUMN "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "productName" TEXT NOT NULL DEFAULT '',
ADD COLUMN "productCategory" TEXT NOT NULL DEFAULT '',
ADD COLUMN "productUnit" TEXT NOT NULL DEFAULT '';

UPDATE "Order" o
SET
  "sellerId" = ml."sellerId",
  "productId" = ml."productId",
  "unitPrice" = ml."price",
  "productName" = p."productName",
  "productCategory" = p."category",
  "productUnit" = p."unit"
FROM "MarketListing" ml
JOIN "Product" p ON p."productId" = ml."productId"
WHERE o."listingId" = ml."listingId";

ALTER TABLE "Order"
ALTER COLUMN "sellerId" DROP DEFAULT,
ALTER COLUMN "productId" DROP DEFAULT,
ALTER COLUMN "unitPrice" DROP DEFAULT,
ALTER COLUMN "productName" DROP DEFAULT,
ALTER COLUMN "productCategory" DROP DEFAULT,
ALTER COLUMN "productUnit" DROP DEFAULT;

CREATE INDEX "MarketListing_sellerId_status_listingType_idx"
ON "MarketListing"("sellerId", "status", "listingType");

CREATE INDEX "MarketListing_status_listingType_createdAt_idx"
ON "MarketListing"("status", "listingType", "createdAt");

CREATE INDEX "Order_companyId_createdAt_idx"
ON "Order"("companyId", "createdAt");

CREATE INDEX "Order_sellerId_idx"
ON "Order"("sellerId");

CREATE INDEX "Order_sellerId_createdAt_idx"
ON "Order"("sellerId", "createdAt");

CREATE INDEX "Order_listingId_idx"
ON "Order"("listingId");

CREATE INDEX "Order_orderStatus_createdAt_idx"
ON "Order"("orderStatus", "createdAt");

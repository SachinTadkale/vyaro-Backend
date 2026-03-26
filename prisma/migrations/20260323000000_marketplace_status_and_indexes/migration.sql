ALTER TYPE "ListingStatus" RENAME VALUE 'SOLD' TO 'CLOSED';

CREATE INDEX "MarketListing_price_idx" ON "MarketListing"("price");
CREATE INDEX "MarketListing_createdAt_idx" ON "MarketListing"("createdAt");
CREATE INDEX "MarketListing_status_listingType_idx" ON "MarketListing"("status", "listingType");

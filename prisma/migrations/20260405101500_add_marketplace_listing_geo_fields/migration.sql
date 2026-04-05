ALTER TABLE "MarketListing"
ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION;

CREATE INDEX "MarketListing_latitude_longitude_idx"
ON "MarketListing"("latitude", "longitude");

CREATE INDEX "MarketListing_status_latitude_longitude_idx"
ON "MarketListing"("status", "latitude", "longitude");

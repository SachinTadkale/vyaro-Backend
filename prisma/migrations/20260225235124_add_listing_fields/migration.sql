/*
  Warnings:

  - Added the required column `price` to the `MarketListing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantity` to the `MarketListing` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MarketListing" ADD COLUMN     "minOrder" DOUBLE PRECISION,
ADD COLUMN     "price" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "quantity" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "listingType" SET DEFAULT 'SELL';

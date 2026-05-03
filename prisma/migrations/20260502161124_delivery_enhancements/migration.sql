/*
  Warnings:

  - The values [USER] on the enum `ActorType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ActorType_new" AS ENUM ('FARMER', 'COMPANY', 'DELIVERY_PARTNER', 'PLATFORM');
ALTER TABLE "Transaction" ALTER COLUMN "actorType" TYPE "ActorType_new" USING ("actorType"::text::"ActorType_new");
ALTER TYPE "ActorType" RENAME TO "ActorType_old";
ALTER TYPE "ActorType_new" RENAME TO "ActorType";
DROP TYPE "public"."ActorType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Delivery" DROP CONSTRAINT "Delivery_partnerId_fkey";

-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "assignmentExpiresAt" TIMESTAMP(3),
ADD COLUMN     "assignmentStatus" TEXT NOT NULL DEFAULT 'OPEN',
ALTER COLUMN "partnerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "FarmDetails" ADD COLUMN     "addressLocal" JSONB;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "productTranslations" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "addressLocal" JSONB;

-- CreateTable
CREATE TABLE "TranslationDictionary" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "original" TEXT NOT NULL,
    "en" TEXT NOT NULL,
    "hi" TEXT NOT NULL,
    "mr" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranslationDictionary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TranslationDictionary_key_key" ON "TranslationDictionary"("key");

-- CreateIndex
CREATE INDEX "TranslationDictionary_key_idx" ON "TranslationDictionary"("key");

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "DeliveryPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

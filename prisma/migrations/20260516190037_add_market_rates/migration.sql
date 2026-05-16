/*
  Warnings:

  - A unique constraint covering the columns `[publicProfileId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[qrShareToken]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `productCategory` on the `Order` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `productUnit` on the `Order` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `category` on the `Product` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `unit` on the `Product` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "PriceDirection" AS ENUM ('UP', 'DOWN', 'STABLE');

-- CreateEnum
CREATE TYPE "DemandLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ProductUnit" AS ENUM ('KG', 'GRAM', 'DOZEN', 'CRATE', 'BOX', 'QUINTAL', 'TON', 'LITER', 'PIECE', 'BUNDLE');

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('VEGETABLES', 'FRUITS', 'GRAINS', 'MILK', 'FLOWERS');

-- CreateEnum
CREATE TYPE "SettingType" AS ENUM ('BOOLEAN', 'STRING', 'NUMBER');

-- CreateEnum
CREATE TYPE "SettingCategory" AS ENUM ('FEATURE', 'ROUTE', 'CRON', 'MAINTENANCE', 'INTEGRATION');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'OWNER';

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "productCategory",
ADD COLUMN     "productCategory" "ProductCategory" NOT NULL,
DROP COLUMN "productUnit",
ADD COLUMN     "productUnit" "ProductUnit" NOT NULL;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "category",
ADD COLUMN     "category" "ProductCategory" NOT NULL,
DROP COLUMN "unit",
ADD COLUMN     "unit" "ProductUnit" NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "location" TEXT,
ADD COLUMN     "profileImage" TEXT,
ADD COLUMN     "profileVisibility" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "publicProfileId" TEXT,
ADD COLUMN     "qrShareToken" TEXT;

-- CreateTable
CREATE TABLE "MarketRate" (
    "id" TEXT NOT NULL,
    "commodity" TEXT NOT NULL,
    "category" TEXT,
    "variety" TEXT,
    "grade" TEXT,
    "mandiName" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "minPrice" DOUBLE PRECISION,
    "maxPrice" DOUBLE PRECISION,
    "modalPrice" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'Quintal',
    "previousPrice" DOUBLE PRECISION,
    "trendPercent" DOUBLE PRECISION,
    "priceDirection" "PriceDirection",
    "demandLevel" "DemandLevel",
    "source" TEXT,
    "sourceRecordId" TEXT,
    "recordedDate" TIMESTAMP(3) NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "displayName" TEXT,
    "value" TEXT NOT NULL,
    "type" "SettingType" NOT NULL DEFAULT 'BOOLEAN',
    "category" "SettingCategory" NOT NULL DEFAULT 'FEATURE',
    "groupKey" TEXT,
    "description" TEXT,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "requiresRestart" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "lastChangedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettingAudit" (
    "id" TEXT NOT NULL,
    "settingKey" TEXT NOT NULL,
    "settingId" TEXT,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemSettingAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteToggle" (
    "id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayName" TEXT,
    "description" TEXT,
    "groupKey" TEXT,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteToggle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteToggleAudit" (
    "id" TEXT NOT NULL,
    "routeToggleId" TEXT NOT NULL,
    "oldValue" BOOLEAN NOT NULL,
    "newValue" BOOLEAN NOT NULL,
    "changedById" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouteToggleAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketRate_commodity_idx" ON "MarketRate"("commodity");

-- CreateIndex
CREATE INDEX "MarketRate_state_idx" ON "MarketRate"("state");

-- CreateIndex
CREATE INDEX "MarketRate_district_idx" ON "MarketRate"("district");

-- CreateIndex
CREATE INDEX "MarketRate_recordedDate_idx" ON "MarketRate"("recordedDate");

-- CreateIndex
CREATE UNIQUE INDEX "MarketRate_commodity_mandiName_district_recordedDate_key" ON "MarketRate"("commodity", "mandiName", "district", "recordedDate");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE INDEX "SystemSetting_category_idx" ON "SystemSetting"("category");

-- CreateIndex
CREATE INDEX "SystemSetting_groupKey_idx" ON "SystemSetting"("groupKey");

-- CreateIndex
CREATE INDEX "SystemSetting_key_idx" ON "SystemSetting"("key");

-- CreateIndex
CREATE INDEX "SystemSettingAudit_settingKey_idx" ON "SystemSettingAudit"("settingKey");

-- CreateIndex
CREATE INDEX "SystemSettingAudit_changedById_idx" ON "SystemSettingAudit"("changedById");

-- CreateIndex
CREATE INDEX "SystemSettingAudit_settingId_idx" ON "SystemSettingAudit"("settingId");

-- CreateIndex
CREATE INDEX "RouteToggle_groupKey_idx" ON "RouteToggle"("groupKey");

-- CreateIndex
CREATE INDEX "RouteToggle_enabled_idx" ON "RouteToggle"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "RouteToggle_method_path_key" ON "RouteToggle"("method", "path");

-- CreateIndex
CREATE INDEX "RouteToggleAudit_routeToggleId_idx" ON "RouteToggleAudit"("routeToggleId");

-- CreateIndex
CREATE INDEX "RouteToggleAudit_changedById_idx" ON "RouteToggleAudit"("changedById");

-- CreateIndex
CREATE UNIQUE INDEX "User_publicProfileId_key" ON "User"("publicProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "User_qrShareToken_key" ON "User"("qrShareToken");

-- AddForeignKey
ALTER TABLE "SystemSetting" ADD CONSTRAINT "SystemSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemSettingAudit" ADD CONSTRAINT "SystemSettingAudit_settingId_fkey" FOREIGN KEY ("settingId") REFERENCES "SystemSetting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemSettingAudit" ADD CONSTRAINT "SystemSettingAudit_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteToggleAudit" ADD CONSTRAINT "RouteToggleAudit_routeToggleId_fkey" FOREIGN KEY ("routeToggleId") REFERENCES "RouteToggle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteToggleAudit" ADD CONSTRAINT "RouteToggleAudit_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

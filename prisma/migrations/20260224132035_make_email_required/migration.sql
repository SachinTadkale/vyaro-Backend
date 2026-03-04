/*
  Warnings:

  - The primary key for the `BankDetails` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `accountType` on the `BankDetails` table. All the data in the column will be lost.
  - You are about to drop the column `aadharImage` on the `Kyc` table. All the data in the column will be lost.
  - You are about to drop the column `aadharNumber` on the `Kyc` table. All the data in the column will be lost.
  - You are about to drop the column `accountNumber` on the `Transaction` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `BankDetails` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[docNo]` on the table `Kyc` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone_no]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `bankName` to the `BankDetails` table without a default value. This is not possible if the table is not empty.
  - The required column `id` was added to the `BankDetails` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `docNo` to the `Kyc` table without a default value. This is not possible if the table is not empty.
  - Added the required column `docType` to the `Kyc` table without a default value. This is not possible if the table is not empty.
  - Added the required column `frontImage` to the `Kyc` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bankDetailsId` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "BankDetails" DROP CONSTRAINT "BankDetails_userId_fkey";

-- DropForeignKey
ALTER TABLE "Inventory" DROP CONSTRAINT "Inventory_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Kyc" DROP CONSTRAINT "Kyc_userId_fkey";

-- DropForeignKey
ALTER TABLE "MarketListing" DROP CONSTRAINT "MarketListing_productId_fkey";

-- DropForeignKey
ALTER TABLE "MarketListing" DROP CONSTRAINT "MarketListing_sellerId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_listingId_fkey";

-- DropForeignKey
ALTER TABLE "Otp" DROP CONSTRAINT "Otp_userId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_orderId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_userId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_userId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_accountNumber_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_paymentId_fkey";

-- DropIndex
DROP INDEX "Kyc_aadharNumber_key";

-- AlterTable
ALTER TABLE "BankDetails" DROP CONSTRAINT "BankDetails_pkey",
DROP COLUMN "accountType",
ADD COLUMN     "bankName" TEXT NOT NULL,
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "BankDetails_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Kyc" DROP COLUMN "aadharImage",
DROP COLUMN "aadharNumber",
ADD COLUMN     "backImage" TEXT,
ADD COLUMN     "docNo" TEXT NOT NULL,
ADD COLUMN     "docType" TEXT NOT NULL,
ADD COLUMN     "frontImage" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "accountNumber",
ADD COLUMN     "bankDetailsId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "gender" TEXT,
ADD COLUMN     "registrationStep" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "FarmDetails" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "village" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "landArea" DOUBLE PRECISION,

    CONSTRAINT "FarmDetails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FarmDetails_userId_key" ON "FarmDetails"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BankDetails_userId_key" ON "BankDetails"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Kyc_docNo_key" ON "Kyc"("docNo");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_no_key" ON "User"("phone_no");

-- AddForeignKey
ALTER TABLE "FarmDetails" ADD CONSTRAINT "FarmDetails_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketListing" ADD CONSTRAINT "MarketListing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketListing" ADD CONSTRAINT "MarketListing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("productId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketListing"("listingId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("orderId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankDetails" ADD CONSTRAINT "BankDetails_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_bankDetailsId_fkey" FOREIGN KEY ("bankDetailsId") REFERENCES "BankDetails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("paymentId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Otp" ADD CONSTRAINT "Otp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kyc" ADD CONSTRAINT "Kyc_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

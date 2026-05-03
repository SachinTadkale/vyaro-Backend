/*
  Warnings:

  - You are about to drop the column `status` on the `Kyc` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Kyc_docNo_key";

-- DropIndex
DROP INDEX "Kyc_userId_idx";

-- DropIndex
DROP INDEX "Kyc_userId_key";

-- AlterTable
ALTER TABLE "Kyc" DROP COLUMN "status";

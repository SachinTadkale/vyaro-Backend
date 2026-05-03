/*
  Warnings:

  - Added the required column `vehicleNumber` to the `DeliveryPartner` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DeliveryPartner" ADD COLUMN     "vehicleNumber" TEXT NOT NULL;

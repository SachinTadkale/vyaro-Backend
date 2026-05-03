/*
  Warnings:

  - Changed the type of `vehicleType` on the `DeliveryPartner` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('TRACTOR', 'MINI_TRUCK', 'PICKUP', 'TRUCK', 'HEAVY_TRUCK');

-- AlterTable
ALTER TABLE "DeliveryPartner" DROP COLUMN "vehicleType",
ADD COLUMN     "vehicleType" "VehicleType" NOT NULL;

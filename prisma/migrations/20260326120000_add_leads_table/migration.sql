-- CreateEnum
CREATE TYPE "LeadRole" AS ENUM ('FARMER', 'COMPANY');

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "LeadRole" NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leads_email_key" ON "leads"("email");

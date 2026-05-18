-- CreateEnum
CREATE TYPE "CreatedSource" AS ENUM ('SYSTEM_BOOTSTRAP', 'ADMIN_PANEL', 'MIGRATION', 'API');

-- CreateEnum
CREATE TYPE "ExternalSyncType" AS ENUM ('MARKET_RATES');

-- CreateEnum
CREATE TYPE "ExternalSyncStatusType" AS ENUM ('SUCCESS', 'FAILED', 'RUNNING', 'LOCKED', 'STALE');

-- CreateEnum
CREATE TYPE "AiRoleContext" AS ENUM ('FARMER', 'COMPANY', 'ADMIN', 'OWNER', 'DELIVERY_PARTNER');

-- CreateEnum
CREATE TYPE "AiMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AiChatStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('OPENROUTER', 'GEMINI', 'OPENAI', 'CLAUDE', 'OLLAMA', 'GROQ');

-- CreateEnum
CREATE TYPE "AiWrapperStatus" AS ENUM ('ACTIVE', 'DISABLED', 'MAINTENANCE');

-- AlterTable
ALTER TABLE "RouteToggle" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "createdSource" "CreatedSource",
ADD COLUMN     "isSeededBySystem" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "moduleKey" TEXT;

-- AlterTable
ALTER TABLE "SystemSetting" ADD COLUMN     "createdSource" "CreatedSource",
ADD COLUMN     "isSeededBySystem" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "ExternalSyncStatus" (
    "id" TEXT NOT NULL,
    "syncType" "ExternalSyncType" NOT NULL,
    "status" "ExternalSyncStatusType" NOT NULL,
    "recordsProcessed" INTEGER,
    "durationMs" INTEGER,
    "lastAttemptAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastFailureAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "source" TEXT,
    "isManualTrigger" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalSyncStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiChatSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "companyId" TEXT,
    "wrapperId" TEXT,
    "roleContext" "AiRoleContext" NOT NULL,
    "title" TEXT,
    "lastMessage" TEXT,
    "language" TEXT,
    "totalMessages" INTEGER NOT NULL DEFAULT 0,
    "status" "AiChatStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AiChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "AiMessageRole" NOT NULL,
    "message" TEXT NOT NULL,
    "responseTimeMs" INTEGER,
    "tokenUsage" INTEGER,
    "modelUsed" TEXT,
    "providerUsed" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPromptTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "roleContext" "AiRoleContext" NOT NULL,
    "badgeLabel" TEXT NOT NULL,
    "promptTemplate" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiPromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiWrapper" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "AiWrapperStatus" NOT NULL DEFAULT 'ACTIVE',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "provider" "AiProvider" NOT NULL,
    "modelName" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 1200,
    "allowedRoles" JSONB NOT NULL,
    "contextConfig" JSONB,
    "badgeConfig" JSONB,
    "moderationConfig" JSONB,
    "responseConfig" JSONB,
    "rateLimitPerMin" INTEGER NOT NULL DEFAULT 20,
    "isStreaming" BOOLEAN NOT NULL DEFAULT true,
    "supportsTools" BOOLEAN NOT NULL DEFAULT false,
    "supportsVision" BOOLEAN NOT NULL DEFAULT false,
    "supportsJsonMode" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AiWrapper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiWrapperUsage" (
    "id" TEXT NOT NULL,
    "wrapperId" TEXT NOT NULL,
    "userId" TEXT,
    "companyId" TEXT,
    "success" BOOLEAN NOT NULL,
    "tokenUsage" INTEGER,
    "responseTimeMs" INTEGER,
    "errorMessage" TEXT,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AiWrapperUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExternalSyncStatus_syncType_key" ON "ExternalSyncStatus"("syncType");

-- CreateIndex
CREATE INDEX "AiChatSession_userId_idx" ON "AiChatSession"("userId");

-- CreateIndex
CREATE INDEX "AiChatSession_companyId_idx" ON "AiChatSession"("companyId");

-- CreateIndex
CREATE INDEX "AiChatSession_status_idx" ON "AiChatSession"("status");

-- CreateIndex
CREATE INDEX "AiChatSession_updatedAt_idx" ON "AiChatSession"("updatedAt");

-- CreateIndex
CREATE INDEX "AiChatMessage_sessionId_idx" ON "AiChatMessage"("sessionId");

-- CreateIndex
CREATE INDEX "AiChatMessage_createdAt_idx" ON "AiChatMessage"("createdAt");

-- CreateIndex
CREATE INDEX "AiPromptTemplate_roleContext_idx" ON "AiPromptTemplate"("roleContext");

-- CreateIndex
CREATE INDEX "AiWrapper_key_status_idx" ON "AiWrapper"("key", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AiWrapper_key_version_key" ON "AiWrapper"("key", "version");

-- CreateIndex
CREATE INDEX "AiWrapperUsage_wrapperId_idx" ON "AiWrapperUsage"("wrapperId");

-- CreateIndex
CREATE INDEX "AiWrapperUsage_createdAt_idx" ON "AiWrapperUsage"("createdAt");

-- CreateIndex
CREATE INDEX "RouteToggle_moduleKey_idx" ON "RouteToggle"("moduleKey");

-- AddForeignKey
ALTER TABLE "AiChatSession" ADD CONSTRAINT "AiChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiChatSession" ADD CONSTRAINT "AiChatSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiChatMessage" ADD CONSTRAINT "AiChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AiChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

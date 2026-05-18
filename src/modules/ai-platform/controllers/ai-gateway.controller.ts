import { Request, Response } from "express";
import asyncHandler from "../../../utils/asyncHandler";
import { aiOrchestrationService } from "../services/ai-orchestration.service";
import { aiPlatformRepository } from "../repositories/ai-platform.repository";
import {
  sairaChatInputSchema,
  sairaBadgePromptSchema,
  sairaSessionParamSchema,
} from "../dto/ai-platform.dto";
import { z } from "zod";
import prisma from "../../../config/prisma";
import { AiRoleContext } from "@prisma/client";

// Type-safe schema validator
function validatePayload<T>(schema: z.Schema<T>, data: any): T {
  return schema.parse(data);
}

/**
 * Main chat gateway controller supporting both direct JSON and E2E SSE streaming.
 */
export const chatController = asyncHandler(async (req: Request, res: Response) => {
  const payload = validatePayload(sairaChatInputSchema, req.body);
  const shouldStream = req.query.stream === "true";

  if (shouldStream) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Prevent Nginx proxy buffering
    res.flushHeaders(); // Open connection immediately

    res.write("data: " + JSON.stringify({ state: "CONNECTING" }) + "\n\n");

    await aiOrchestrationService.orchestrateChatStream(
      req.user,
      payload,
      (textChunk) => {
        res.write("data: " + JSON.stringify({ chunk: textChunk }) + "\n\n");
      },
      (sessionData) => {
        res.write("data: " + JSON.stringify({ done: true, ...sessionData }) + "\n\n");
        res.end();
      },
      (error) => {
        res.write("data: " + JSON.stringify({ error: error.message || "Streaming interrupted" }) + "\n\n");
        res.end();
      }
    );
  } else {
    const result = await aiOrchestrationService.orchestrateChatCompletion(req.user, payload);
    res.status(200).json({
      success: true,
      message: "Chat processed successfully",
      data: result,
    });
  }
});

/**
 * Resolves prompt badge suggestions into compiled, context-enriched inputs.
 */
export const badgePromptController = asyncHandler(async (req: Request, res: Response) => {
  const payload = validatePayload(sairaBadgePromptSchema, req.body);
  const compiledPrompt = await aiOrchestrationService.resolveBadgePrompt(req.user, payload.badgeLabel);

  res.status(200).json({
    success: true,
    data: {
      badgeLabel: payload.badgeLabel,
      resolvedPrompt: compiledPrompt,
    },
  });
});

/**
 * Retrieves dynamic action badges by role. Self-heals by seeding default templates.
 */
export const getPromptsController = asyncHandler(async (req: Request, res: Response) => {
  let roleContext: AiRoleContext = AiRoleContext.FARMER;
  const role = req.user.role;
  if (role === "COMPANY") roleContext = AiRoleContext.COMPANY;
  else if (role === "ADMIN") roleContext = AiRoleContext.ADMIN;
  else if (role === "OWNER") roleContext = AiRoleContext.OWNER;
  else if (role === "DELIVERY_PARTNER") roleContext = AiRoleContext.DELIVERY_PARTNER;

  let templates = await prisma.aiPromptTemplate.findMany({
    where: { roleContext, isActive: true },
  });

  if (templates.length === 0) {
    const defaults = [
      { title: "Market Prices", badgeLabel: "Market Prices", promptTemplate: "What is today's tomato or onion rate near me? Please tell me the current mandi rates.", roleContext: AiRoleContext.FARMER },
      { title: "Crop Advice", badgeLabel: "Crop Advice", promptTemplate: "Which crop should I grow in this season? Provide a detailed guide.", roleContext: AiRoleContext.FARMER },
      { title: "Weather Help", badgeLabel: "Weather Help", promptTemplate: "Suggest irrigation precautions based on current weather.", roleContext: AiRoleContext.FARMER },
      { title: "Fertilizer Suggestion", badgeLabel: "Fertilizer Suggestion", promptTemplate: "Suggest the best organic or NPK fertilizer dosage.", roleContext: AiRoleContext.FARMER },
      { title: "Current Mandi Rates", badgeLabel: "Current Mandi Rates", promptTemplate: "Show the latest mandi rates in my state.", roleContext: AiRoleContext.COMPANY },
      { title: "Peak Delivery Hours", badgeLabel: "Peak Delivery Hours", promptTemplate: "What are the busiest mandi delivery hours?", roleContext: AiRoleContext.DELIVERY_PARTNER },
      { title: "Fraud Detection Insights", badgeLabel: "Fraud Detection Insights", promptTemplate: "What are common indicators of transaction fraud?", roleContext: AiRoleContext.ADMIN },
      { title: "Revenue Growth", badgeLabel: "Revenue Growth", promptTemplate: "How can FarmZy increase its overall transaction margin?", roleContext: AiRoleContext.OWNER }
    ];

    const matchDefaults = defaults.filter((d) => d.roleContext === roleContext);
    for (const d of matchDefaults) {
      await prisma.aiPromptTemplate.create({
        data: d,
      });
    }

    templates = await prisma.aiPromptTemplate.findMany({
      where: { roleContext, isActive: true },
    });
  }

  res.status(200).json({
    success: true,
    data: templates,
  });
});

/**
 * Fetches active conversation sessions for the authenticated user.
 */
export const getSessionsController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const result = await aiPlatformRepository.getUserSessions(userId);
  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Retrieves full conversation history records for a single session.
 */
export const getSessionHistoryController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = validatePayload(sairaSessionParamSchema, req.params);
  const result = await aiPlatformRepository.findConversationHistory(id);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Archives a chat session.
 */
export const archiveSessionController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = validatePayload(sairaSessionParamSchema, req.params);
  await aiPlatformRepository.archiveSession(id);

  res.status(200).json({
    success: true,
    message: "Saira conversation archived successfully",
  });
});

/**
 * Soft deletes a chat session and all nested message lines.
 */
export const deleteSessionController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = validatePayload(sairaSessionParamSchema, req.params);
  await aiPlatformRepository.softDeleteSession(id);

  res.status(200).json({
    success: true,
    message: "Saira conversation deleted successfully",
  });
});

/**
 * ADMIN/OWNER: Returns high-level platform AI usage logs and costs metrics.
 */
export const getAdminAnalyticsController = asyncHandler(async (req: Request, res: Response) => {
  const usageStats = await prisma.aiWrapperUsage.aggregate({
    _sum: {
      tokenUsage: true,
      estimatedCost: true,
    },
    _avg: {
      responseTimeMs: true,
    },
  });

  res.status(200).json({
    success: true,
    data: {
      totalTokenUsage: usageStats._sum?.tokenUsage ?? 0,
      totalEstimatedCostUSD: usageStats._sum?.estimatedCost ?? 0.0,
      averageResponseTimeMs: usageStats._avg?.responseTimeMs ?? 0.0,
    },
  });
});

/**
 * ADMIN/OWNER: Returns token summaries categorized by user accounts.
 */
export const getAdminUsageController = asyncHandler(async (req: Request, res: Response) => {
  const userUsageGroup = await prisma.aiWrapperUsage.groupBy({
    by: ["userId"],
    _sum: {
      tokenUsage: true,
      estimatedCost: true,
    },
    _count: {
      id: true,
    },
  });

  res.status(200).json({
    success: true,
    data: userUsageGroup,
  });
});

import { Request, Response } from "express";
import asyncHandler from "../../../utils/asyncHandler";
import * as aiService from "../services/ai.service";
import {
  chatInputSchema,
  badgePromptSchema,
  sessionParamSchema,
} from "../dto/ai.dto";
import { validateSchema } from "../../../modules/disputes/dispute.schema";

/**
 * Main chat controller supporting both direct JSON and SSE streaming outputs.
 */
export const chatController = asyncHandler(async (req: Request, res: Response) => {
  const payload = validateSchema(chatInputSchema, req.body);
  const shouldStream = req.query.stream === "true";

  if (shouldStream) {
    // Set headers for Server-Sent Events (SSE)
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders(); // Establish stream link immediately

    await aiService.submitChatPromptStream(
      req.user,
      payload,
      (textChunk) => {
        // Send individual text chunk
        res.write(`data: ${JSON.stringify({ chunk: textChunk })}\n\n`);
      },
      (sessionData) => {
        // Send final completion message and close stream
        res.write(`data: ${JSON.stringify({ done: true, ...sessionData })}\n\n`);
        res.end();
      },
      (error) => {
        res.write(`data: ${JSON.stringify({ error: error.message || "Streaming interrupted" })}\n\n`);
        res.end();
      }
    );
  } else {
    // Standard direct JSON response
    const result = await aiService.submitChatPrompt(req.user, payload);
    res.status(200).json({
      success: true,
      message: "Chat processed successfully",
      data: result,
    });
  }
});

/**
 * Resolves a prompt badge chip into a context-enriched instruction template.
 */
export const badgePromptController = asyncHandler(async (req: Request, res: Response) => {
  const payload = validateSchema(badgePromptSchema, req.body);
  const result = await aiService.resolveBadgePrompt(req.user, payload.badgeLabel, payload.language);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Returns dynamic action badges by role.
 */
export const getPromptsController = asyncHandler(async (req: Request, res: Response) => {
  const result = await aiService.getActiveBadges(req.user);
  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Fetches active conversation sessions for the current logged-in account.
 */
export const getSessionsController = asyncHandler(async (req: Request, res: Response) => {
  const result = await aiService.getUserSessions(req.user);
  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Retrieves the full chat history of an individual session.
 */
export const getSessionHistoryController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = validateSchema(sessionParamSchema, req.params);
  const result = await aiService.getSessionHistory(req.user, id);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Archives a chat session.
 */
export const archiveSessionController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = validateSchema(sessionParamSchema, req.params);
  await aiService.archiveSession(req.user, id);

  res.status(200).json({
    success: true,
    message: "AI session archived successfully",
  });
});

/**
 * Soft deletes a chat session.
 */
export const deleteSessionController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = validateSchema(sessionParamSchema, req.params);
  await aiService.deleteSession(req.user, id);

  res.status(200).json({
    success: true,
    message: "AI session deleted successfully",
  });
});

/**
 * ADMIN/OWNER: Returns high-level platform usage cost and metrics.
 */
export const getAdminAnalyticsController = asyncHandler(async (req: Request, res: Response) => {
  const result = await aiService.getAdminAiMetrics();
  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * ADMIN/OWNER: Returns token summaries by user accounts.
 */
export const getAdminUsageController = asyncHandler(async (req: Request, res: Response) => {
  const result = await aiService.getAdminAiUsage();
  res.status(200).json({
    success: true,
    data: result,
  });
});

import {
  AiRoleContext,
  AiChatStatus,
  AiMessageRole,
} from "@prisma/client";
import * as aiRepository from "../repositories/ai.repository";
import * as openRouter from "../providers/openrouter.provider";
import * as promptEngine from "../prompts/prompt.engine";
import { DEFAULT_PROMPT_TEMPLATES } from "../constants/ai.constants";
import { ChatInput } from "../dto/ai.dto";
import ApiError from "../../../utils/apiError";
import { logger } from "../../../utils/logger";
import { OpenRouterMessage } from "../types/ai.types";

/**
 * Converts user roles to matching AI Role Contexts.
 */
const getAiRoleContext = (role: string): AiRoleContext => {
  switch (role) {
    case "ADMIN":
      return AiRoleContext.ADMIN;
    case "OWNER":
      return AiRoleContext.OWNER;
    case "COMPANY":
      return AiRoleContext.COMPANY;
    case "DELIVERY_PARTNER":
      return AiRoleContext.DELIVERY_PARTNER;
    default:
      return AiRoleContext.FARMER;
  }
};

/**
 * Get active sessions for a user.
 */
export const getUserSessions = async (user: any) => {
  const isCompany = user.role === "COMPANY";
  return aiRepository.findSessionsByUser({
    userId: isCompany ? undefined : user.userId,
    companyId: isCompany ? user.companyId : undefined,
    status: AiChatStatus.ACTIVE,
  });
};

/**
 * Get details details for a session including history, with security bounds.
 */
export const getSessionHistory = async (user: any, sessionId: string) => {
  const session = await aiRepository.findSessionById(sessionId);
  if (!session) {
    throw new ApiError(404, "AI Chat session not found");
  }

  // RBAC Enforcement: Verify owner of the session
  if (user.role !== "ADMIN" && user.role !== "OWNER") {
    if (session.companyId && session.companyId !== user.companyId) {
      throw new ApiError(403, "Access denied: unauthorized session access");
    }
    if (session.userId && session.userId !== user.userId) {
      throw new ApiError(403, "Access denied: unauthorized session access");
    }
  }

  return session;
};

/**
 * Archive a chat session.
 */
export const archiveSession = async (user: any, sessionId: string) => {
  // Enforce auth check first
  await getSessionHistory(user, sessionId);
  return aiRepository.updateSessionStatus(sessionId, AiChatStatus.ARCHIVED);
};

/**
 * Soft delete a chat session.
 */
export const deleteSession = async (user: any, sessionId: string) => {
  // Enforce auth check first
  await getSessionHistory(user, sessionId);
  return aiRepository.updateSessionStatus(sessionId, AiChatStatus.DELETED);
};

/**
 * Fetch dynamic active badges based on role. Self-heals by seeding if empty.
 */
export const getActiveBadges = async (user: any) => {
  const roleContext = getAiRoleContext(user.role);
  let badges = await aiRepository.findActivePromptTemplates(roleContext);

  if (badges.length === 0) {
    logger.info(`🌱 Seeding default prompt templates for role context: ${roleContext}`);
    const defaults = DEFAULT_PROMPT_TEMPLATES.filter((t) => t.roleContext === roleContext);
    
    for (const d of defaults) {
      await aiRepository.createPromptTemplate(d);
    }
    badges = await aiRepository.findActivePromptTemplates(roleContext);
  }

  return badges;
};

/**
 * Injects localization and location/farm contexts into prompt templates
 * before presenting them to the user.
 */
export const resolveBadgePrompt = async (user: any, badgeLabel: string, targetLang: "en" | "hi" | "mr") => {
  const roleContext = getAiRoleContext(user.role);
  const template = await aiRepository.findPromptTemplateByLabel(roleContext, badgeLabel);

  if (!template) {
    throw new ApiError(404, `Prompt template for badge '${badgeLabel}' not found`);
  }

  let prompt = template.promptTemplate;

  // Customize prompt based on context
  if (roleContext === AiRoleContext.FARMER) {
    const { contextText } = await promptEngine.buildFarmerContext(user.userId);
    // Append or inject mandi values directly where helpful
    prompt = `Context: ${contextText.trim()}\n\nQuestion: ${prompt}`;
  } else if (roleContext === AiRoleContext.COMPANY) {
    const { contextText } = await promptEngine.buildCompanyContext(user.companyId);
    prompt = `Context: ${contextText.trim()}\n\nQuestion: ${prompt}`;
  }

  return {
    badgeLabel: template.badgeLabel,
    resolvedPrompt: prompt,
    language: targetLang,
  };
};

/**
 * Submits a chat prompt synchronously (Non-streaming).
 */
export const submitChatPrompt = async (user: any, payload: ChatInput) => {
  const roleContext = getAiRoleContext(user.role);
  const isCompany = roleContext === AiRoleContext.COMPANY;

  let session;
  if (payload.sessionId) {
    session = await getSessionHistory(user, payload.sessionId);
  } else {
    // Generate simple title from message
    const title = payload.message.substring(0, 40) + (payload.message.length > 40 ? "..." : "");
    session = await aiRepository.createChatSession({
      userId: isCompany ? undefined : user.userId,
      companyId: isCompany ? user.companyId : undefined,
      roleContext,
      language: payload.language,
      title,
    });
  }

  // 1. Build contextual data
  let contextData = "";
  if (roleContext === AiRoleContext.FARMER) {
    const result = await promptEngine.buildFarmerContext(user.userId);
    contextData = result.contextText;
  } else if (roleContext === AiRoleContext.COMPANY) {
    const result = await promptEngine.buildCompanyContext(user.companyId);
    contextData = result.contextText;
  } else if (roleContext === AiRoleContext.ADMIN) {
    contextData = await promptEngine.buildAdminContext();
  } else if (roleContext === AiRoleContext.OWNER) {
    contextData = await promptEngine.buildOwnerContext();
  }

  // 2. Generate System Prompt with target language
  const systemPromptContent = promptEngine.generateSystemPrompt(
    roleContext,
    contextData,
    payload.language
  );

  // 3. Load conversation history (limit to last 10 messages for token optimization)
  const recentMessages = await aiRepository.findRecentMessages(session.id, 10);

  // 4. Map message history
  const messagesToSend: OpenRouterMessage[] = [
    { role: "system", content: systemPromptContent },
    ...recentMessages.map((m: any) => ({
      role: m.role.toLowerCase() as "user" | "assistant" | "system",
      content: m.message,
    })),
    { role: "user", content: payload.message },
  ];

  // Save the user's message first
  await aiRepository.createChatMessage({
    sessionId: session.id,
    role: AiMessageRole.USER,
    message: payload.message,
  });

  // 5. Call OpenRouter
  const startTime = Date.now();
  const response = await openRouter.callOpenRouter(messagesToSend);
  const responseTimeMs = Date.now() - startTime;

  // 6. Save assistant's answer
  const assistantMsg = await aiRepository.createChatMessage({
    sessionId: session.id,
    role: AiMessageRole.ASSISTANT,
    message: response.text,
    responseTimeMs,
    tokenUsage: response.tokenUsage,
    modelUsed: response.model,
  });

  // 7. Update session details
  await aiRepository.updateSessionLastMessage(session.id, response.text);

  return {
    sessionId: session.id,
    sessionTitle: session.title,
    userMessage: payload.message,
    assistantMessage: assistantMsg.message,
    modelUsed: response.model,
  };
};

/**
 * Handles SSE conversation streaming.
 */
export const submitChatPromptStream = async (
  user: any,
  payload: ChatInput,
  onChunk: (text: string) => void,
  onComplete: (sessionData: { sessionId: string; title: string }) => void,
  onError: (err: any) => void
): Promise<void> => {
  const roleContext = getAiRoleContext(user.role);
  const isCompany = roleContext === AiRoleContext.COMPANY;

  let session: any;
  try {
    if (payload.sessionId) {
      session = await getSessionHistory(user, payload.sessionId);
    } else {
      const title = payload.message.substring(0, 40) + (payload.message.length > 40 ? "..." : "");
      session = await aiRepository.createChatSession({
        userId: isCompany ? undefined : user.userId,
        companyId: isCompany ? user.companyId : undefined,
        roleContext,
        language: payload.language,
        title,
      });
    }

    // Save user query immediately
    await aiRepository.createChatMessage({
      sessionId: session.id,
      role: AiMessageRole.USER,
      message: payload.message,
    });

    // 1. Build contextual data
    let contextData = "";
    if (roleContext === AiRoleContext.FARMER) {
      const result = await promptEngine.buildFarmerContext(user.userId);
      contextData = result.contextText;
    } else if (roleContext === AiRoleContext.COMPANY) {
      const result = await promptEngine.buildCompanyContext(user.companyId);
      contextData = result.contextText;
    } else if (roleContext === AiRoleContext.ADMIN) {
      contextData = await promptEngine.buildAdminContext();
    } else if (roleContext === AiRoleContext.OWNER) {
      contextData = await promptEngine.buildOwnerContext();
    }

    // 2. Generate System Prompt
    const systemPromptContent = promptEngine.generateSystemPrompt(
      roleContext,
      contextData,
      payload.language
    );

    // 3. Load history
    const recentMessages = await aiRepository.findRecentMessages(session.id, 10);

    // 4. Map payload messages
    const messagesToSend: OpenRouterMessage[] = [
      { role: "system", content: systemPromptContent },
      ...recentMessages
        .filter((m: any) => m.message !== payload.message) // Filter out recently added user message if duplicate
        .map((m: any) => ({
          role: m.role.toLowerCase() as "user" | "assistant" | "system",
          content: m.message,
        })),
      { role: "user", content: payload.message },
    ];

    const startTime = Date.now();

    // 5. Open SSE Stream
    await openRouter.streamOpenRouter(
      messagesToSend,
      (textChunk) => {
        onChunk(textChunk);
      },
      async (fullText, tokenUsage, modelUsed) => {
        try {
          const responseTimeMs = Date.now() - startTime;

          // Save assistant answer
          await aiRepository.createChatMessage({
            sessionId: session.id,
            role: AiMessageRole.ASSISTANT,
            message: fullText,
            responseTimeMs,
            tokenUsage,
            modelUsed,
          });

          // Update session metadata
          await aiRepository.updateSessionLastMessage(session.id, fullText);

          onComplete({ sessionId: session.id, title: session.title ?? "" });
        } catch (saveErr) {
          logger.error(saveErr as any, "❌ Failed to save streamed AI response");
          onError(saveErr);
        }
      },
      (err) => {
        onError(err);
      }
    );
  } catch (err: any) {
    logger.error(err as any, "❌ submitChatPromptStream initiation failed");
    onError(err);
  }
};

/**
 * Administrative AI metrics.
 */
export const getAdminAiMetrics = async () => {
  return aiRepository.getAiAnalyticsMetrics();
};

/**
 * Administrative AI usage.
 */
export const getAdminAiUsage = async () => {
  return aiRepository.getAiUsageSummaries();
};

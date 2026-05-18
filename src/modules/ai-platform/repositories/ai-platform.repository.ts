import prisma from "../../../config/prisma";
import {
  AiWrapper,
  AiWrapperStatus,
  AiRoleContext,
  AiMessageRole,
  AiChatStatus,
} from "@prisma/client";

export class AiPlatformRepository {
  /**
   * Resolves an active wrapper configuration by key.
   */
  public async findActiveWrapperByKey(key: string): Promise<AiWrapper | null> {
    return prisma.aiWrapper.findFirst({
      where: {
        key,
        status: AiWrapperStatus.ACTIVE,
        deletedAt: null,
      },
    });
  }

  /**
   * Fetches conversation history session with 10-message conversational memory limit.
   */
  public async findConversationHistory(sessionId: string, memoryLimit = 10) {
    return prisma.aiChatMessage.findMany({
      where: {
        sessionId,
      },
      orderBy: { createdAt: "desc" },
      take: memoryLimit,
    }).then((messages) => messages.reverse()); // Keep standard linear conversation order
  }

  /**
   * Creates a new chat session.
   */
  public async createSession(userId: string, role: string, wrapperId: string) {
    // Map string role to type-safe AiRoleContext enum explicitly
    let roleContext: AiRoleContext = AiRoleContext.FARMER;
    if (role === "COMPANY") {
      roleContext = AiRoleContext.COMPANY;
    } else if (role === "ADMIN") {
      roleContext = AiRoleContext.ADMIN;
    } else if (role === "OWNER") {
      roleContext = AiRoleContext.OWNER;
    } else if (role === "DELIVERY_PARTNER") {
      roleContext = AiRoleContext.DELIVERY_PARTNER;
    }

    return prisma.aiChatSession.create({
      data: {
        userId: role === "COMPANY" ? null : userId,
        companyId: role === "COMPANY" ? userId : null,
        roleContext,
        wrapperId,
        title: "New Saira AI Conversation",
      },
    });
  }

  /**
   * Creates a chat message record.
   */
  public async createMessage(
    sessionId: string,
    role: "USER" | "ASSISTANT" | "SYSTEM",
    content: string,
    promptTokens = 0,
    completionTokens = 0,
    responseTimeMs = 0,
    modelUsed = "deepseek",
    providerUsed = "OPENROUTER"
  ) {
    let msgRole: AiMessageRole = AiMessageRole.USER;
    if (role === "ASSISTANT") {
      msgRole = AiMessageRole.ASSISTANT;
    } else if (role === "SYSTEM") {
      msgRole = AiMessageRole.SYSTEM;
    }

    return prisma.aiChatMessage.create({
      data: {
        sessionId,
        role: msgRole,
        message: content,
        tokenUsage: promptTokens + completionTokens,
        responseTimeMs,
        modelUsed,
        providerUsed,
      },
    });
  }

  /**
   * Records provider usage analytics.
   */
  public async createUsageLog(data: {
    userId: string;
    companyId?: string;
    wrapperId: string;
    success: boolean;
    tokenUsage: number;
    responseTimeMs: number;
    errorMessage?: string;
    estimatedCost: number;
  }) {
    const isCompany = !!data.companyId;
    return prisma.aiWrapperUsage.create({
      data: {
        wrapperId: data.wrapperId,
        userId: isCompany ? null : data.userId,
        companyId: data.companyId || null,
        success: data.success,
        tokenUsage: data.tokenUsage,
        responseTimeMs: data.responseTimeMs,
        errorMessage: data.errorMessage,
        estimatedCost: data.estimatedCost,
      },
    });
  }

  /**
   * Fetches active conversation sessions for a user.
   */
  public async getUserSessions(userId: string) {
    return prisma.aiChatSession.findMany({
      where: {
        OR: [
          { userId },
          { companyId: userId },
        ],
        deletedAt: null,
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  /**
   * Soft deletes a chat session.
   */
  public async softDeleteSession(sessionId: string) {
    const now = new Date();
    await prisma.aiChatSession.update({
      where: { id: sessionId },
      data: { deletedAt: now },
    });
  }

  /**
   * Archives a chat session.
   */
  public async archiveSession(sessionId: string) {
    return prisma.aiChatSession.update({
      where: { id: sessionId },
      data: { status: AiChatStatus.ARCHIVED },
    });
  }
}
export const aiPlatformRepository = new AiPlatformRepository();

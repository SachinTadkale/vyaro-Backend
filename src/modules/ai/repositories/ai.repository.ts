import {
  AiChatSession,
  AiChatMessage,
  AiPromptTemplate,
  AiRoleContext,
  AiMessageRole,
  AiChatStatus,
  Prisma,
} from "@prisma/client";
import prisma from "../../../config/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;
const getDb = (db?: DbClient) => db ?? prisma;

// --- SESSION QUERIES ---

export const createChatSession = async (
  data: {
    userId?: string;
    companyId?: string;
    roleContext: AiRoleContext;
    language?: string;
    title?: string;
    lastMessage?: string;
  },
  db?: DbClient
) => {
  return getDb(db).aiChatSession.create({
    data,
    include: {
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });
};

export const findSessionById = async (id: string, db?: DbClient) => {
  return getDb(db).aiChatSession.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
};

export const findSessionsByUser = async (
  params: {
    userId?: string;
    companyId?: string;
    status?: AiChatStatus;
  },
  db?: DbClient
) => {
  const whereClause: Prisma.AiChatSessionWhereInput = {
    status: params.status ?? AiChatStatus.ACTIVE,
  };

  if (params.userId) {
    whereClause.userId = params.userId;
  } else if (params.companyId) {
    whereClause.companyId = params.companyId;
  } else {
    // Return empty if neither is specified
    return [];
  }

  return getDb(db).aiChatSession.findMany({
    where: whereClause,
    orderBy: { updatedAt: "desc" },
  });
};

export const updateSessionStatus = async (
  id: string,
  status: AiChatStatus,
  db?: DbClient
) => {
  return getDb(db).aiChatSession.update({
    where: { id },
    data: { status },
  });
};

export const updateSessionLastMessage = async (
  id: string,
  message: string,
  db?: DbClient
) => {
  return getDb(db).aiChatSession.update({
    where: { id },
    data: {
      lastMessage: message.substring(0, 150),
      totalMessages: { increment: 1 },
    },
  });
};

// --- MESSAGE QUERIES ---

export const createChatMessage = async (
  data: {
    sessionId: string;
    role: AiMessageRole;
    message: string;
    responseTimeMs?: number;
    tokenUsage?: number;
    modelUsed?: string;
    metadata?: Prisma.InputJsonValue;
  },
  db?: DbClient
) => {
  return getDb(db).aiChatMessage.create({
    data,
  });
};

export const findRecentMessages = async (
  sessionId: string,
  limit = 10,
  db?: DbClient
) => {
  return getDb(db).aiChatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    take: limit,
  }).then((messages: any[]) => messages.reverse());
};

// --- PROMPT TEMPLATE QUERIES ---

export const findActivePromptTemplates = async (
  roleContext: AiRoleContext,
  db?: DbClient
) => {
  return getDb(db).aiPromptTemplate.findMany({
    where: {
      roleContext,
      isActive: true,
    },
    orderBy: { title: "asc" },
  });
};

export const findPromptTemplateByLabel = async (
  roleContext: AiRoleContext,
  badgeLabel: string,
  db?: DbClient
) => {
  return getDb(db).aiPromptTemplate.findFirst({
    where: {
      roleContext,
      badgeLabel,
      isActive: true,
    },
  });
};

export const createPromptTemplate = async (
  data: {
    title: string;
    roleContext: AiRoleContext;
    badgeLabel: string;
    promptTemplate: string;
  },
  db?: DbClient
) => {
  return getDb(db).aiPromptTemplate.create({
    data,
  });
};

// --- ANALYTICS QUERIES ---

export const getAiAnalyticsMetrics = async (db?: DbClient) => {
  const client = getDb(db);

  // 1. Token Aggregation and latency
  const stats = await client.aiChatMessage.aggregate({
    _sum: {
      tokenUsage: true,
    },
    _avg: {
      responseTimeMs: true,
    },
  });

  // 2. Active Session count
  const activeSessions = await client.aiChatSession.count({
    where: { status: AiChatStatus.ACTIVE },
  });

  // 3. Failure rate (where tokenUsage is null or metadata has error flag)
  const totalMessagesCount = await client.aiChatMessage.count({
    where: { role: AiMessageRole.ASSISTANT },
  });
  const failedMessagesCount = await client.aiChatMessage.count({
    where: {
      role: AiMessageRole.ASSISTANT,
      message: { contains: "Error calling OpenRouter" },
    },
  });

  const failureRate = totalMessagesCount > 0 ? (failedMessagesCount / totalMessagesCount) * 100 : 0;

  // 4. Usage by Model
  const modelStats = await client.aiChatMessage.groupBy({
    by: ["modelUsed"],
    where: { role: AiMessageRole.ASSISTANT },
    _count: {
      id: true,
    },
  });

  return {
    totalTokens: stats._sum.tokenUsage ?? 0,
    averageResponseTimeMs: stats._avg.responseTimeMs ?? 0,
    failureRate,
    activeSessions,
    usageByModel: modelStats.map((item: any) => ({
      model: item.modelUsed ?? "unknown",
      count: item._count.id,
    })),
  };
};

export const getAiUsageSummaries = async (db?: DbClient) => {
  const client = getDb(db);
  
  // Custom query or aggregation for usage summaries grouped by User/Company
  const sessions = await client.aiChatSession.findMany({
    include: {
      _count: {
        select: { messages: true },
      },
      messages: {
        where: { role: AiMessageRole.ASSISTANT },
        select: { tokenUsage: true },
      },
    },
  });

  const summaries = sessions.map((session: any) => {
    const totalTokens = session.messages.reduce((sum: number, msg: any) => sum + (msg.tokenUsage ?? 0), 0);
    return {
      sessionId: session.id,
      userId: session.userId,
      companyId: session.companyId,
      roleContext: session.roleContext,
      totalTokens,
      messageCount: session._count.messages,
    };
  });

  return summaries;
};

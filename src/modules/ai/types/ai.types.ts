import { AiRoleContext, AiMessageRole, AiChatStatus } from "@prisma/client";

export interface OpenRouterMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface OpenRouterConfig {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  timeoutMs: number;
}

export interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenRouterResponseChoice {
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: OpenRouterResponseChoice[];
  usage?: OpenRouterUsage;
  error?: {
    message: string;
    code: number;
  };
}

export interface FarmerContextInput {
  userId: string;
  language?: string;
}

export interface CompanyContextInput {
  companyId: string;
  language?: string;
}

export interface AdminContextInput {
  userId: string;
}

export interface OwnerContextInput {
  userId: string;
}

export interface DeliveryContextInput {
  userId: string;
}

export interface AiAnalyticsResult {
  totalTokens: number;
  averageResponseTimeMs: number;
  failureRate: number;
  activeSessions: number;
  popularBadges: { badgeLabel: string; count: number }[];
  usageByModel: { model: string; count: number }[];
}

export interface AiUsageSummary {
  userId?: string;
  companyId?: string;
  roleContext: AiRoleContext;
  totalTokens: number;
  sessionCount: number;
  messageCount: number;
}

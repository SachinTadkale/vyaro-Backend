/**
 * Saira AI Platform - Shared Contracts & Typings Registry
 * Purpose: Defines provider-agnostic interfaces, capability flags, cost schemas,
 * and the state machine lifecycle enums for enterprise AI orchestration.
 */

export enum AiProvider {
  OPENROUTER = "OPENROUTER",
  GEMINI = "GEMINI",
  OPENAI = "OPENAI",
  CLAUDE = "CLAUDE",
  OLLAMA = "OLLAMA",
  GROQ = "GROQ"
}

export enum AiWrapperStatus {
  ACTIVE = "ACTIVE",
  DISABLED = "DISABLED",
  MAINTENANCE = "MAINTENANCE"
}

export enum AiRoleContext {
  FARMER = "FARMER",
  COMPANY = "COMPANY",
  ADMIN = "ADMIN",
  OWNER = "OWNER",
  DELIVERY_PARTNER = "DELIVERY_PARTNER"
}

export enum AiMessageRole {
  USER = "USER",
  ASSISTANT = "ASSISTANT",
  SYSTEM = "SYSTEM"
}

export enum AiChatStatus {
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
  DELETED = "DELETED"
}

/**
 * AI Execution State Machine Lifecycle States
 * Purpose: Track execution state transitions internally for telemetry,
 * cost auditing, debugging, and circuit breaker evaluation.
 */
export enum AiExecutionState {
  PENDING = "PENDING",
  LOADING_WRAPPER = "LOADING_WRAPPER",
  INJECTING_CONTEXT = "INJECTING_CONTEXT",
  COMPILING_PROMPT = "COMPILING_PROMPT",
  VALIDATING_PROMPT = "VALIDATING_PROMPT",
  CALLING_PROVIDER = "CALLING_PROVIDER",
  STREAMING = "STREAMING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  FALLBACK_TRIGGERED = "FALLBACK_TRIGGERED"
}

/**
 * Capability flags for active AI wrappers
 */
export interface AiWrapperCapabilities {
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsJsonMode: boolean;
}

/**
 * Badge configuration for quick actions suggestion chips
 */
export interface AiBadgeConfig {
  badges: Array<{
    id: string;
    label: string;
    promptTemplate: string;
    icon?: string;
  }>;
}

/**
 * Dynamic Context Injection Configuration
 */
export interface AiContextConfig {
  requiredContexts: Array<"USER_PROFILE" | "WEATHER" | "MARKET_RATES" | "DELIVERY_STATS" | "ORDERS" | "DISPUTES">;
}

/**
 * Prompt Moderation & Safety Configuration
 */
export interface AiModerationConfig {
  blockToxicInput: boolean;
  preventSystemPromptLeaks: boolean;
  bannedKeywords?: string[];
}

/**
 * Expected structured JSON output templates
 */
export interface AiResponseConfig {
  jsonSchema?: string; // stringified JSON schema
}

/**
 * Standard Provider Adapter Contract Interface
 */
export interface AiProviderAdapter {
  generateResponse(
    systemPrompt: string,
    history: Array<{ role: AiMessageRole; content: string }>,
    userPrompt: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      modelName?: string;
      responseFormatJson?: boolean;
    }
  ): Promise<{
    text: string;
    tokenUsage: number;
    responseTimeMs: number;
    modelUsed: string;
  }>;

  streamResponse(
    systemPrompt: string,
    history: Array<{ role: AiMessageRole; content: string }>,
    userPrompt: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      modelName?: string;
      responseFormatJson?: boolean;
    },
    onChunk: (chunk: string) => void
  ): Promise<{
    text: string;
    tokenUsage: number;
    responseTimeMs: number;
    modelUsed: string;
  }>;

  validateConfig(): boolean;
  handleError(error: any): Error;
}

/**
 * Distributed telemetry execution context payload
 */
export interface AiExecutionContext {
  traceId: string;
  requestId: string;
  executionId: string;
  sessionId?: string;
  userId?: string;
  companyId?: string;
  tenantId?: string;
  role?: string;
  state: AiExecutionState;
}

/**
 * Cost tracking transaction ledger model
 */
export interface AiCostEstimate {
  estimatedCost: number; // in USD
  inputTokens: number;
  outputTokens: number;
  providerRatePerMInput: number;
  providerRatePerMOutput: number;
}

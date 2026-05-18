import crypto from "crypto";
import { AiPlatformRepository } from "../repositories/ai-platform.repository";
import { WrapperCacheService } from "../cache/wrapper-cache.service";
import { AiResponseCacheService } from "../cache/ai-response-cache.service";
import { ProviderHealthService } from "../providers/provider-health.service";
import { AiPromptSanitizer } from "../middleware/ai-prompt-sanitizer";
import { AiOutputFilter } from "../middleware/ai-output-filter";
import { AiContextInjectorRouter } from "../context/ai-context.injector";
import { PromptTemplateEngine } from "../prompts/prompt-template.engine";
import { AiExecutionQueue } from "../jobs/ai-execution.queue";
import { AiCostEstimator } from "../cost/ai-cost-estimator";
import { OpenRouterAdapter } from "../adapters/openrouter/openrouter.adapter";
import { GeminiAdapter } from "../adapters/gemini/gemini.adapter";
import { OpenAIAdapter } from "../adapters/openai/openai.adapter";
import {
  AiProvider,
  AiMessageRole,
} from "../types/ai-platform.types";
import { aiGovernanceService } from "./ai-governance.service";
import { AIUsageStatus } from "@prisma/client";

export class AiOrchestrationService {
  private repo = new AiPlatformRepository();
  private wrapperCache = WrapperCacheService.getInstance();
  private responseCache = AiResponseCacheService.getInstance();
  private healthService = ProviderHealthService.getInstance();
  private asyncQueue = AiExecutionQueue.getInstance();

  // Adapter instances
  private openRouterAdapter = new OpenRouterAdapter();
  private geminiAdapter = new GeminiAdapter();
  private openAIAdapter = new OpenAIAdapter();

  /**
   * Helper to dynamically resolve role-based wrapper key if not explicitly requested.
   */
  private resolveDefaultWrapperKey(role?: string): string {
    if (role === "COMPANY") return "company_procurement";
    if (role === "DELIVERY_PARTNER") return "delivery_logistics";
    if (role === "ADMIN" || role === "OWNER") return "admin_optimizer";
    return "farmer_advisor";
  }

  /**
   * Orchestrates synchronous (non-streaming) AI completions.
   */
  public async orchestrateChatCompletion(
    user: any,
    payload: {
      wrapperKey?: string;
      userPrompt?: string;
      message?: string;
      sessionId?: string;
      language?: string;
      context?: Record<string, any>;
      mode?: string;
    }
  ): Promise<any> {
    const traceId = crypto.randomUUID();
    const startTime = Date.now();

    // ─── Step 0: Governance pre-flight (restrictions + quota) ──────────────
    await aiGovernanceService.runPreflightCheck({
      userId: user.userId || user.id,
      role: user.role,
    });

    // Extract prompt robustly
    const rawPrompt = (payload.userPrompt || payload.message || "").trim();
    if (!rawPrompt) {
      throw new Error("Chat prompt cannot be empty.");
    }

    // Resolve wrapper key dynamically
    const wrapperKey = payload.wrapperKey || this.resolveDefaultWrapperKey(user.role);

    // 1. Load active wrapper configuration (Redis cache first, fall back to DB)
    let wrapper = await this.wrapperCache.getCachedWrapper(wrapperKey);
    if (!wrapper) {
      wrapper = await this.repo.findActiveWrapperByKey(wrapperKey);
      if (!wrapper) {
        throw new Error(`Active wrapper key "${wrapperKey}" not found.`);
      }
      await this.wrapperCache.setCachedWrapper(wrapperKey, wrapper);
    }

    // 2. Security Prompt Sanitization
    const sanitizeResult = AiPromptSanitizer.sanitizeInput(rawPrompt);
    if (!sanitizeResult.isClean) {
      throw new Error(sanitizeResult.reason || "Security guardrail violation.");
    }

    // 3. Resolve dynamic contexts in parallel prior to execution
    const requiredContexts = (wrapper.contextConfig as string[]) || [];
    const dynamicContextBlock = await AiContextInjectorRouter.resolveContexts(
      requiredContexts,
      user.userId || user.id
    );

    // 4. Resolve or create chat conversation session
    let sessionId = payload.sessionId;
    if (!sessionId) {
      const session = await this.repo.createSession(
        user.userId || user.id,
        user.role,
        wrapper.id
      );
      sessionId = session.id;
    }

    // Build frontend context block first for size checks
    const frontendContextBlock = this.buildFrontendContextBlock(payload.context);
    const contextCharCount = (dynamicContextBlock + frontendContextBlock).length;
    const maxHistoryMessages = contextCharCount > 1500 ? 3 : 5;

    // 5. Gather memory limit with adaptive history trimming
    const dbHistory = await this.repo.findConversationHistory(sessionId);
    const slicedHistory = dbHistory.slice(-maxHistoryMessages);
    const formattedHistory = slicedHistory.map((m) => ({
      role: m.role as AiMessageRole,
      content: m.message,
    }));

    // 6. Build prompt templates
    const systemPromptTemplate = wrapper.systemPrompt;
    const interpolatedSystemPrompt = PromptTemplateEngine.interpolate(systemPromptTemplate, {
      USER_NAME: user.name || "User",
      LOCATION: user.address || "Maharashtra",
      DYNAMIC_CONTEXT: dynamicContextBlock + frontendContextBlock,
    });

    // ─── Hard Emergency Cutoff check (approximate token budgeting) ───────────
    const estimatedInputTokens = Math.ceil((interpolatedSystemPrompt.length + rawPrompt.length) / 4);
    if (estimatedInputTokens > 800) {
      throw Object.assign(
        new Error(`[AI-4009] Input Token Budget Exceeded: Pre-flight estimation (${estimatedInputTokens} tokens) exceeded the emergency limit of 800 tokens to prevent runaway prompt costs. Please reduce input or context complexity.`),
        { statusCode: 400, restrictionCode: "AI-4009" }
      );
    }

    // Calculate request fingerprinting & high token contributor
    const historyContent = formattedHistory.reduce((acc, curr) => acc + curr.content, "");
    const contextContent = dynamicContextBlock + frontendContextBlock;
    const { largestContributor, contextHash } = this.calculateTelemetry(
      interpolatedSystemPrompt,
      historyContent,
      contextContent,
      rawPrompt
    );

    // 7. Execute Call with Health Cooldown Evaluation & Fallbacks
    // Load strict response controls from process.env with DB fallbacks
    const temperature = process.env.AI_TEMPERATURE !== undefined ? Number(process.env.AI_TEMPERATURE) : (wrapper.temperature ?? 0.3);
    let maxTokens = this.resolveModeMaxTokens(payload.mode, wrapper.maxTokens ?? 180);
    if (process.env.AI_MAX_TOKENS !== undefined) {
      maxTokens = Number(process.env.AI_MAX_TOKENS);
    }

    // Define provider priority: check env first, otherwise default to GEMINI
    const envProvider = process.env.AI_PROVIDER?.toUpperCase();
    let primaryProvider: AiProvider = AiProvider.GEMINI; // Default is GEMINI primary!
    if (envProvider === "OPENROUTER") {
      primaryProvider = AiProvider.OPENROUTER;
    } else if (envProvider === "GEMINI") {
      primaryProvider = AiProvider.GEMINI;
    } else if (wrapper.provider) {
      primaryProvider = wrapper.provider as AiProvider;
    }

    let selectedProvider = primaryProvider;
    let adapter = this.resolveAdapter(selectedProvider);

    // If primary provider is unhealthy, switch to fallback instantly
    if (!this.healthService.isProviderHealthy(selectedProvider)) {
      console.warn(`[CIRCUIT BREAKER] Primary provider ${selectedProvider} is unhealthy. Triggering fallback.`);
      selectedProvider = selectedProvider === AiProvider.GEMINI ? AiProvider.OPENROUTER : AiProvider.GEMINI;
      adapter = this.resolveAdapter(selectedProvider);
    }

    let responseText = "";
    let tokenUsage = 0;
    let modelUsed = "";

    try {
      // Record session user message record in DB
      await this.repo.createMessage(
        sessionId,
        "USER",
        rawPrompt,
        0,
        0,
        0,
        selectedProvider === AiProvider.GEMINI ? (process.env.GEMINI_MODEL || "gemini-2.5-flash-lite") : wrapper.modelName,
        selectedProvider
      );

      const result = await adapter.generateResponse(
        interpolatedSystemPrompt,
        formattedHistory,
        rawPrompt,
        {
          temperature,
          maxTokens,
          modelName: selectedProvider === AiProvider.GEMINI ? (process.env.GEMINI_MODEL || undefined) : (wrapper.modelName || undefined),
        }
      );

      responseText = result.text;
      tokenUsage = result.tokenUsage;
      modelUsed = result.modelUsed;
    } catch (err: any) {
      console.error(`[ORCHESTRATOR] Primary provider failed: ${selectedProvider}. Error:`, err.message);
      
      // Toggle to fallback provider (Gemini -> OpenRouter, or OpenRouter -> Gemini)
      selectedProvider = selectedProvider === AiProvider.GEMINI ? AiProvider.OPENROUTER : AiProvider.GEMINI;
      adapter = this.resolveAdapter(selectedProvider);
      console.log(`[ORCHESTRATOR] Executing fallback call on: ${selectedProvider}`);

      const fallbackResult = await adapter.generateResponse(
        interpolatedSystemPrompt,
        formattedHistory,
        rawPrompt,
        {
          temperature,
          maxTokens,
          modelName: selectedProvider === AiProvider.GEMINI ? (process.env.GEMINI_MODEL || undefined) : undefined,
        }
      );

      responseText = fallbackResult.text;
      tokenUsage = fallbackResult.tokenUsage;
      modelUsed = fallbackResult.modelUsed;
    }

    // 8. Real-time Output Filter Sanitization
    const filteredResult = AiOutputFilter.filterOutput(responseText);
    const responseTimeMs = Date.now() - startTime;
    
    // Save AI assistant message in DB
    const assistantMsg = await this.repo.createMessage(
      sessionId,
      "ASSISTANT",
      filteredResult.filteredText,
      Math.ceil(interpolatedSystemPrompt.length / 4),
      tokenUsage,
      responseTimeMs,
      modelUsed,
      selectedProvider
    );

    // 9. Cost tracking & usage metrics logs aggregated out-of-band asynchronously
    const costEstimate = AiCostEstimator.calculateCost(
      modelUsed,
      Math.ceil(interpolatedSystemPrompt.length / 4),
      tokenUsage
    );

    this.asyncQueue.addJob("AGGREGATE_ANALYTICS", {
      userId: user.userId || user.id,
      companyId: user.companyId || undefined,
      wrapperId: wrapper.id,
      success: true,
      tokenUsage: Math.ceil(interpolatedSystemPrompt.length / 4) + tokenUsage,
      responseTimeMs,
      estimatedCost: costEstimate.estimatedCost,
    }).catch(() => {});

    // ─── Governance: log usage + increment quota (non-blocking) ────────────
    const promptToks = Math.ceil(interpolatedSystemPrompt.length / 4);
    const totalToks = promptToks + tokenUsage;
    aiGovernanceService.logUsage({
      userId: user.userId || user.id,
      role: user.role,
      provider: selectedProvider as any,
      modelName: modelUsed,
      promptTokens: promptToks,
      completionTokens: tokenUsage,
      totalTokens: totalToks,
      estimatedCost: costEstimate.estimatedCost,
      requestPreview: rawPrompt,
      responsePreview: filteredResult.filteredText,
      route: payload.context?.route,
      module: payload.context?.module,
      status: AIUsageStatus.SUCCESS,
      latencyMs: responseTimeMs,
      sessionId,
      contextHash,
      largestContributor,
    }).catch(() => {});
    aiGovernanceService.incrementQuota(user.userId || user.id, user.role, totalToks).catch(() => {});

    return {
      sessionId,
      messageId: assistantMsg.id,
      text: filteredResult.filteredText,
      model: modelUsed,
    };
  }

  /**
   * Orchestrates SSE non-blocking streaming.
   * Fetches DB records *before* starting connection, closes prisma handles, then streams.
   */
  public async orchestrateChatStream(
    user: any,
    payload: {
      wrapperKey?: string;
      userPrompt?: string;
      message?: string;
      sessionId?: string;
      language?: string;
      context?: Record<string, any>;
      mode?: string;
    },
    onChunk: (chunk: string) => void,
    onComplete: (sessionData: any) => void,
    onError: (err: any) => void
  ): Promise<void> {
    const traceId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      // ─── Step 0: Governance pre-flight (restrictions + quota) ────────────
      await aiGovernanceService.runPreflightCheck({
        userId: user.userId || user.id,
        role: user.role,
      });

      const rawPrompt = (payload.userPrompt || payload.message || "").trim();
      if (!rawPrompt) {
        throw new Error("Chat prompt cannot be empty.");
      }

      const wrapperKey = payload.wrapperKey || this.resolveDefaultWrapperKey(user.role);

      // 1. Gather all database contexts BEFORE stream begins
      let wrapper = await this.wrapperCache.getCachedWrapper(wrapperKey);
      if (!wrapper) {
        wrapper = await this.repo.findActiveWrapperByKey(wrapperKey);
        if (!wrapper) {
          throw new Error(`Active wrapper key "${wrapperKey}" not found.`);
        }
        await this.wrapperCache.setCachedWrapper(wrapperKey, wrapper);
      }

      const sanitizeResult = AiPromptSanitizer.sanitizeInput(rawPrompt);
      if (!sanitizeResult.isClean) {
        throw new Error(sanitizeResult.reason || "Security guardrail violation.");
      }

      const requiredContexts = (wrapper.contextConfig as string[]) || [];
      const dynamicContextBlock = await AiContextInjectorRouter.resolveContexts(
        requiredContexts,
        user.userId || user.id
      );

      let sessionId = payload.sessionId;
      if (!sessionId) {
        const session = await this.repo.createSession(
          user.userId || user.id,
          user.role,
          wrapper.id
        );
        sessionId = session.id;
      }

      // Build frontend context block first for size checks
      const frontendContextBlock = this.buildFrontendContextBlock(payload.context);
      const contextCharCount = (dynamicContextBlock + frontendContextBlock).length;
      const maxHistoryMessages = contextCharCount > 1500 ? 3 : 5;

      const dbHistory = await this.repo.findConversationHistory(sessionId);
      const slicedHistory = dbHistory.slice(-maxHistoryMessages);
      const formattedHistory = slicedHistory.map((m) => ({
        role: m.role as AiMessageRole,
        content: m.message,
      }));

      // Commit user message to DB immediately to release handles before SSE starts
      const temperature = process.env.AI_TEMPERATURE !== undefined ? Number(process.env.AI_TEMPERATURE) : (wrapper.temperature ?? 0.3);
      let maxTokens = this.resolveModeMaxTokens(payload.mode, wrapper.maxTokens ?? 180);
      if (process.env.AI_MAX_TOKENS !== undefined) {
        maxTokens = Number(process.env.AI_MAX_TOKENS);
      }

      // Define provider priority: check env first, otherwise default to GEMINI
      const envProvider = process.env.AI_PROVIDER?.toUpperCase();
      let primaryProvider: AiProvider = AiProvider.GEMINI; // Default is GEMINI primary!
      if (envProvider === "OPENROUTER") {
        primaryProvider = AiProvider.OPENROUTER;
      } else if (envProvider === "GEMINI") {
        primaryProvider = AiProvider.GEMINI;
      } else if (wrapper.provider) {
        primaryProvider = wrapper.provider as AiProvider;
      }

      let selectedProvider = primaryProvider;
      let adapter = this.resolveAdapter(selectedProvider);

      if (!this.healthService.isProviderHealthy(selectedProvider)) {
        console.warn(`[CIRCUIT BREAKER] Stream Primary provider ${selectedProvider} is unhealthy. Triggering fallback.`);
        selectedProvider = selectedProvider === AiProvider.GEMINI ? AiProvider.OPENROUTER : AiProvider.GEMINI;
        adapter = this.resolveAdapter(selectedProvider);
      }

      await this.repo.createMessage(
        sessionId,
        "USER",
        rawPrompt,
        0,
        0,
        0,
        selectedProvider === AiProvider.GEMINI ? (process.env.GEMINI_MODEL || "gemini-2.5-flash-lite") : wrapper.modelName,
        selectedProvider
      );

      const systemPromptTemplate = wrapper.systemPrompt;
      const interpolatedSystemPrompt = PromptTemplateEngine.interpolate(systemPromptTemplate, {
        USER_NAME: user.name || "User",
        LOCATION: user.address || "Maharashtra",
        DYNAMIC_CONTEXT: dynamicContextBlock + frontendContextBlock,
      });

      // ─── Hard Emergency Cutoff check (approximate token budgeting) ───────────
      const estimatedInputTokens = Math.ceil((interpolatedSystemPrompt.length + rawPrompt.length) / 4);
      if (estimatedInputTokens > 800) {
        throw Object.assign(
          new Error(`[AI-4009] Input Token Budget Exceeded: Pre-flight estimation (${estimatedInputTokens} tokens) exceeded the emergency limit of 800 tokens to prevent runaway prompt costs. Please reduce input or context complexity.`),
          { statusCode: 400, restrictionCode: "AI-4009" }
        );
      }

      // Calculate request fingerprinting & high token contributor
      const historyContent = formattedHistory.reduce((acc, curr) => acc + curr.content, "");
      const contextContent = dynamicContextBlock + frontendContextBlock;
      const { largestContributor, contextHash } = this.calculateTelemetry(
        interpolatedSystemPrompt,
        historyContent,
        contextContent,
        rawPrompt
      );

      // 3. Initiate Stream
      console.log(`[ORCHESTRATOR] Starting SSE Stream via: ${selectedProvider}`);
      
      let responseText = "";
      let tokenUsage = 0;
      let modelUsed = "";
      let responseTimeMs = 0;

      try {
        const result = await adapter.streamResponse(
          interpolatedSystemPrompt,
          formattedHistory,
          rawPrompt,
          {
            temperature,
            maxTokens,
            modelName: selectedProvider === AiProvider.GEMINI ? (process.env.GEMINI_MODEL || undefined) : (wrapper.modelName || undefined),
          },
          (chunk) => {
            onChunk(chunk);
          }
        );
        responseText = result.text;
        tokenUsage = result.tokenUsage;
        modelUsed = result.modelUsed;
        responseTimeMs = Date.now() - startTime;
      } catch (streamErr: any) {
        console.error(`[ORCHESTRATOR] SSE Stream primary provider failed: ${selectedProvider}. Error:`, streamErr.message);

        // Fallback streaming via symmetric provider switch (Gemini -> OpenRouter, or OpenRouter -> Gemini)
        selectedProvider = selectedProvider === AiProvider.GEMINI ? AiProvider.OPENROUTER : AiProvider.GEMINI;
        adapter = this.resolveAdapter(selectedProvider);
        console.log(`[ORCHESTRATOR] Executing streaming fallback via: ${selectedProvider}`);

        const fallbackResult = await adapter.streamResponse(
          interpolatedSystemPrompt,
          formattedHistory,
          rawPrompt,
          {
            temperature,
            maxTokens,
            modelName: selectedProvider === AiProvider.GEMINI ? (process.env.GEMINI_MODEL || undefined) : undefined,
          },
          (chunk) => {
            onChunk(chunk);
          }
        );
        responseText = fallbackResult.text;
        tokenUsage = fallbackResult.tokenUsage;
        modelUsed = fallbackResult.modelUsed;
        responseTimeMs = Date.now() - startTime;
      }

      // Clean output
      const filteredResult = AiOutputFilter.filterOutput(responseText);

      // Save assistant message response
      const assistantMsg = await this.repo.createMessage(
        sessionId,
        "ASSISTANT",
        filteredResult.filteredText,
        Math.ceil(interpolatedSystemPrompt.length / 4),
        tokenUsage,
        responseTimeMs,
        modelUsed,
        selectedProvider
      );

      const costEstimate = AiCostEstimator.calculateCost(
        modelUsed,
        Math.ceil(interpolatedSystemPrompt.length / 4),
        tokenUsage
      );

      // Log telemetry asynchronously
      this.asyncQueue.addJob("AGGREGATE_ANALYTICS", {
        userId: user.userId || user.id,
        companyId: user.companyId || undefined,
        wrapperId: wrapper.id,
        success: true,
        tokenUsage: Math.ceil(interpolatedSystemPrompt.length / 4) + tokenUsage,
        responseTimeMs,
        estimatedCost: costEstimate.estimatedCost,
      }).catch(() => {});

      // ─── Governance: log usage + increment quota (non-blocking) ──────────
      const promptToks = Math.ceil(interpolatedSystemPrompt.length / 4);
      const totalToks = promptToks + tokenUsage;
      aiGovernanceService.logUsage({
        userId: user.userId || user.id,
        role: user.role,
        provider: selectedProvider as any,
        modelName: modelUsed,
        promptTokens: promptToks,
        completionTokens: tokenUsage,
        totalTokens: totalToks,
        estimatedCost: costEstimate.estimatedCost,
        requestPreview: rawPrompt,
        responsePreview: filteredResult.filteredText,
        route: payload.context?.route,
        module: payload.context?.module,
        status: AIUsageStatus.SUCCESS,
        latencyMs: responseTimeMs,
        sessionId,
        contextHash,
        largestContributor,
      }).catch(() => {});
      aiGovernanceService.incrementQuota(user.userId || user.id, user.role, totalToks).catch(() => {});

      onComplete({
        sessionId,
        messageId: assistantMsg.id,
        text: filteredResult.filteredText,
        model: modelUsed,
      });
    } catch (err: any) {
      console.error("[ORCHESTRATOR] SSE Stream encountered error:", err.message);
      // Log governance failure (non-blocking)
      aiGovernanceService.logUsage({
        userId: user.userId || user.id,
        role: user.role,
        provider: AiProvider.GEMINI as any,
        modelName: "unknown",
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        status: AIUsageStatus.FAILED,
        sessionId: payload.sessionId,
      }).catch(() => {});
      onError(err);
    }
  }

  /**
   * Resolves a badge suggested prompt chip context templates.
   */
  public async resolveBadgePrompt(user: any, badgeLabel: string): Promise<string> {
    const dynamicPromptMap: Record<string, string> = {
      "Market Prices": "Show me the latest market Mandi rates for crops in my district. {{DYNAMIC_CONTEXT}}",
      "Crop Advice": "Provide seasonal advisory crops information for my farm in {{LOCATION}}.",
      "Weather Help": "What is the detailed agricultural weather forecast today? {{DYNAMIC_CONTEXT}}",
      "Sell Crops": "Guide me on how to list and sell my harvested crops to verified corporate buyers.",
      "Fertilizer Suggestion": "Recommend fertilizer ratios based on standard soil moisture: {{DYNAMIC_CONTEXT}}",
    };

    const template = dynamicPromptMap[badgeLabel] || `Ask Saira AI: ${badgeLabel}`;
    
    // Resolve dynamic mandi/weather context as variables
    const dynamicContextBlock = await AiContextInjectorRouter.resolveContexts(
      ["WEATHER", "MARKET_RATES"],
      user.userId || user.id
    );

    return PromptTemplateEngine.interpolate(template, {
      LOCATION: user.address || "Maharashtra",
      DYNAMIC_CONTEXT: dynamicContextBlock,
    });
  }

  private buildFrontendContextBlock(context?: Record<string, any>): string {
    if (!context) return "";
    let block = "\n[ACTIVE DASHBOARD CONTEXT]:\n";
    if (context.route) block += `- Current Route: ${context.route}\n`;
    if (context.module) block += `- Active Module: ${context.module}\n`;
    if (context.tab) block += `- Selected Tab: ${context.tab}\n`;
    if (context.userRole) block += `- User Role: ${context.userRole}\n`;
    if (context.entityId) block += `- Selected Entity ID: ${context.entityId}\n`;
    if (context.stats && typeof context.stats === "object") {
      block += `- Screen Metrics: ${JSON.stringify(context.stats)}\n`;
    }
    if (context.filters && typeof context.filters === "object") {
      block += `- Active Filters: ${JSON.stringify(context.filters)}\n`;
    }
    return block;
  }

  private resolveAdapter(provider: AiProvider) {
    switch (provider) {
      case AiProvider.OPENROUTER:
        return this.openRouterAdapter;
      case AiProvider.GEMINI:
        return this.geminiAdapter;
      case AiProvider.OPENAI:
        return this.openAIAdapter;
      default:
        return this.openRouterAdapter;
    }
  }

  /**
   * Helper to perform request context fingerprinting and high token source breakdown.
   */
  private calculateTelemetry(
    systemPrompt: string,
    historyContent: string,
    contextContent: string,
    userInput: string
  ): { largestContributor: string; contextHash: string } {
    const lengths = [
      { name: "SYSTEM_PROMPT", len: systemPrompt.length },
      { name: "HISTORY", len: historyContent.length },
      { name: "CONTEXT", len: contextContent.length },
      { name: "USER_INPUT", len: userInput.length },
    ];
    lengths.sort((a, b) => b.len - a.len);
    const largestContributor = lengths[0].name;

    const hashString = systemPrompt + historyContent + contextContent + userInput;
    const contextHash = crypto.createHash("sha256").update(hashString).digest("hex");

    return { largestContributor, contextHash };
  }

  /**
   * Helper to resolve AI Conversation Mode max tokens.
   */
  private resolveModeMaxTokens(mode?: string, fallbackMax?: number): number {
    if (mode === "QUICK_ASSIST") return 120;
    if (mode === "ANALYTICS") return 300;
    if (mode === "DEBUG") return 500;
    return fallbackMax ?? 180;
  }
}
export const aiOrchestrationService = new AiOrchestrationService();

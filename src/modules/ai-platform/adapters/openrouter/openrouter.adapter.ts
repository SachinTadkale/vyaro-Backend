import axios from "axios";
import {
  AiProviderAdapter,
  AiMessageRole,
} from "../../types/ai-platform.types";
import { ProviderHealthService } from "../../providers/provider-health.service";
import { AiProvider } from "../../types/ai-platform.types";

export class OpenRouterAdapter implements AiProviderAdapter {
  private getApiKey = () => process.env.OPENROUTER_API_KEY || "";
  private getBaseUrl = () =>
    process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
  private getModel = () =>
    process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat-v3-0324:free";
  
  private getFallbackModels(): string[] {
    const listStr = process.env.OPENROUTER_FALLBACK_MODELS || "";
    return listStr.split(",").map((m) => m.trim()).filter(Boolean);
  }

  private getModelChain(primaryModel: string): string[] {
    const fallbacks = this.getFallbackModels();
    const chain = [primaryModel];
    for (const f of fallbacks) {
      if (!chain.includes(f)) {
        chain.push(f);
      }
    }
    return chain;
  }

  private healthService = ProviderHealthService.getInstance();

  public async generateResponse(
    systemPrompt: string,
    history: Array<{ role: AiMessageRole; content: string }>,
    userPrompt: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      modelName?: string;
      responseFormatJson?: boolean;
    },
  ): Promise<{
    text: string;
    tokenUsage: number;
    responseTimeMs: number;
    modelUsed: string;
  }> {
    const apiKey = this.getApiKey();
    const baseUrl = this.getBaseUrl();
    const model = options.modelName || this.getModel();
    const startTime = Date.now();

    if (!apiKey) {
      const warningText =
        "System Note: OpenRouter API key is missing. Please add OPENROUTER_API_KEY to enable live AI responses.";
      return {
        text: warningText,
        tokenUsage: 0,
        responseTimeMs: 0,
        modelUsed: "mock-warning-model",
      };
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((h) => ({
        role: h.role.toLowerCase(),
        content: h.content,
      })),
      { role: "user", content: userPrompt },
    ];

    const modelsToTry = this.getModelChain(model);
    let lastError: any = null;

    for (const modelAttempt of modelsToTry) {
      try {
        console.log(`[OPENROUTER] Attempting response generation using model: ${modelAttempt}`);
        const response = await axios.post(
          `${baseUrl}/chat/completions`,
          {
            model: modelAttempt,
            messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 1200,
            response_format: options.responseFormatJson
              ? { type: "json_object" }
              : undefined,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://farmzy.com",
              "X-Title": "Saira Ai System",
            },
            timeout: 8000, // Strict 8-second execution timeout to prevent thread hanging
          },
        );

        const data = response.data;
        if (data.error) {
          throw new Error(
            `OpenRouter Remote Error: ${data.error.message} (code: ${data.error.code})`,
          );
        }

        const text = data.choices?.[0]?.message?.content || "";
        const tokenUsage = data.usage?.total_tokens ?? 0;
        const modelUsed = data.model || modelAttempt;
        const responseTimeMs = Date.now() - startTime;

        // Track health metrics
        this.healthService.recordSuccess(AiProvider.OPENROUTER, responseTimeMs);

        console.log(`[OPENROUTER] Success using model: ${modelUsed}`);
        return { text, tokenUsage, responseTimeMs, modelUsed };
      } catch (err: any) {
        lastError = err;
        const errMsg =
          err.response?.data?.error?.message ||
          err.message ||
          "Axios connection failed";
        console.warn(`[OPENROUTER] Model attempt failed: ${modelAttempt}. Error: ${errMsg}. Trying next fallback...`);
      }
    }

    // If all attempts failed
    this.healthService.recordFailure(AiProvider.OPENROUTER, lastError.message || "All models failed");
    throw this.handleError(lastError);
  }

  public async streamResponse(
    systemPrompt: string,
    history: Array<{ role: AiMessageRole; content: string }>,
    userPrompt: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      modelName?: string;
      responseFormatJson?: boolean;
    },
    onChunk: (chunk: string) => void,
  ): Promise<{
    text: string;
    tokenUsage: number;
    responseTimeMs: number;
    modelUsed: string;
  }> {
    const apiKey = this.getApiKey();
    const baseUrl = this.getBaseUrl();
    const model = options.modelName || this.getModel();
    const startTime = Date.now();

    if (!apiKey) {
      const mockText =
        "System Note: OpenRouter API key is missing. Please add OPENROUTER_API_KEY to enable live AI responses.";
      onChunk(mockText);
      return {
        text: mockText,
        tokenUsage: 0,
        responseTimeMs: 0,
        modelUsed: "mock-warning-model",
      };
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((h) => ({
        role: h.role.toLowerCase(),
        content: h.content,
      })),
      { role: "user", content: userPrompt },
    ];

    const modelsToTry = this.getModelChain(model);
    let lastError: any = null;

    for (const modelAttempt of modelsToTry) {
      try {
        console.log(`[OPENROUTER-STREAM] Attempting streaming using model: ${modelAttempt}`);
        const response = await axios.post(
          `${baseUrl}/chat/completions`,
          {
            model: modelAttempt,
            messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 1200,
            response_format: options.responseFormatJson
              ? { type: "json_object" }
              : undefined,
            stream: true,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://farmzy.com",
              "X-Title": "Saira Ai System",
            },
            responseType: "stream",
            timeout: 10000, // 10-second timeout for streaming initial connection
          },
        );

        const stream = response.data;
        let fullText = "";
        let modelUsed = modelAttempt;
        let totalTokens = 0;

        await new Promise<void>((resolve, reject) => {
          stream.on("data", (chunk: Buffer) => {
            const payloadString = chunk.toString("utf8");
            const lines = payloadString.split("\n");

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              if (trimmed === "data: [DONE]") continue;

              if (trimmed.startsWith("data: ")) {
                try {
                  const dataJson = JSON.parse(trimmed.slice(6));

                  if (dataJson.usage) {
                    totalTokens = dataJson.usage.total_tokens;
                  }
                  if (dataJson.model) {
                    modelUsed = dataJson.model;
                  }

                  const textChunk = dataJson.choices?.[0]?.delta?.content || "";
                  if (textChunk) {
                    fullText += textChunk;
                    onChunk(textChunk);
                  }
                } catch (jsonErr) {
                  // Ignore partial JSON line cuts
                }
              }
            }
          });

          stream.on("end", () => {
            resolve();
          });

          stream.on("error", (streamErr: any) => {
            reject(streamErr);
          });
        });

        const responseTimeMs = Date.now() - startTime;

        // Calculate token estimation if not returned directly by streaming chunks
        if (totalTokens === 0) {
          totalTokens = Math.ceil((fullText.length / 4) * 1.3);
        }

        this.healthService.recordSuccess(AiProvider.OPENROUTER, responseTimeMs);
        console.log(`[OPENROUTER-STREAM] Success using model: ${modelUsed}`);

        return {
          text: fullText,
          tokenUsage: totalTokens,
          responseTimeMs,
          modelUsed,
        };
      } catch (err: any) {
        lastError = err;
        const errMsg = err.message || "Streaming execution failed";
        console.warn(`[OPENROUTER-STREAM] Model attempt failed: ${modelAttempt}. Error: ${errMsg}. Trying next fallback...`);
      }
    }

    // If all attempts failed
    this.healthService.recordFailure(AiProvider.OPENROUTER, lastError.message || "All models failed");
    throw this.handleError(lastError);
  }

  public validateConfig(): boolean {
    return !!this.getApiKey();
  }

  public handleError(error: any): Error {
    const isDev = process.env.NODE_ENV === "development" || process.env.NODE_ENV !== "production";
    let message = error.response?.data?.error?.message || error.message || "OpenRouter Request Failed";
    
    if (isDev) {
      const model = error.config?.data ? JSON.parse(error.config.data)?.model : "unknown model";
      let devHint = `\n[DEV HINT] Debug Info:\n- Configured Model: "${model || this.getModel()}"\n- Status Code: ${error.response?.status || "N/A"}`;
      
      if (error.response?.status === 404) {
        devHint += `\n- Recommendation: The model may have been deprecated or deleted by OpenRouter. Ensure OPENROUTER_MODEL in your .env or AiWrapper in Prisma is updated to a supported model (e.g. 'deepseek/deepseek-v4-flash:free').`;
      } else if (error.response?.status === 401) {
        devHint += `\n- Recommendation: Check that your OPENROUTER_API_KEY in .env is valid and active.`;
      } else if (error.response?.status === 429) {
        devHint += `\n- Recommendation: You have hit OpenRouter rate limits. Consider using a paid model or checking free-tier limits.`;
      } else if (error.code === 'ECONNABORTED') {
        devHint += `\n- Recommendation: Request timed out. Check your internet connection or increase the adapter timeout value in openrouter.adapter.ts.`;
      }
      message += devHint;
    }
    
    return new Error(`[OpenRouterAdapter] ${message}`);
  }
}

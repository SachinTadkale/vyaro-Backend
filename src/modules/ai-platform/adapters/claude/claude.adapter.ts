import axios from "axios";
import { AiProviderAdapter, AiMessageRole, AiProvider } from "../../types/ai-platform.types";
import { ProviderHealthService } from "../../providers/provider-health.service";

export class ClaudeAdapter implements AiProviderAdapter {
  private getApiKey = () => process.env.ANTHROPIC_API_KEY || "";
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
    }
  ): Promise<{
    text: string;
    tokenUsage: number;
    responseTimeMs: number;
    modelUsed: string;
  }> {
    const apiKey = this.getApiKey();
    const model = options.modelName || "claude-3-5-sonnet-latest";
    const startTime = Date.now();

    if (!apiKey) {
      const simulatedText = `[SIMULATED CLAUDE FALLBACK] Anthropic Claude active in fallback state. Prompt received: "${userPrompt}"`;
      return {
        text: simulatedText,
        tokenUsage: Math.ceil(simulatedText.length / 4),
        responseTimeMs: 90,
        modelUsed: `${model}-simulated`,
      };
    }

    try {
      // Anthropics Messages endpoint mapping
      const messages = [
        ...history.map((h) => ({
          role: h.role === AiMessageRole.ASSISTANT ? "assistant" : "user",
          content: h.content,
        })),
        { role: "user", content: userPrompt },
      ];

      const response = await axios.post(
        "https://api.anthropic.com/v1/messages",
        {
          model,
          messages,
          system: systemPrompt,
          max_tokens: options.maxTokens ?? 1200,
          temperature: options.temperature ?? 0.7,
        },
        {
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          timeout: 8000,
        }
      );

      const data = response.data;
      const text = data.content?.[0]?.text || "";
      const totalTokens = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);
      const responseTimeMs = Date.now() - startTime;

      this.healthService.recordSuccess(AiProvider.CLAUDE, responseTimeMs);

      return {
        text,
        tokenUsage: totalTokens,
        responseTimeMs,
        modelUsed: model,
      };
    } catch (err: any) {
      this.healthService.recordFailure(AiProvider.CLAUDE, err.message);
      throw this.handleError(err);
    }
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
    onChunk: (chunk: string) => void
  ): Promise<{
    text: string;
    tokenUsage: number;
    responseTimeMs: number;
    modelUsed: string;
  }> {
    const result = await this.generateResponse(systemPrompt, history, userPrompt, options);
    const words = result.text.split(" ");
    for (const word of words) {
      onChunk(word + " ");
      await new Promise((r) => setTimeout(r, 20));
    }
    return result;
  }

  public validateConfig(): boolean {
    return !!this.getApiKey();
  }

  public handleError(error: any): Error {
    return new Error(`[ClaudeAdapter] ${error.response?.data?.error?.message || error.message}`);
  }
}

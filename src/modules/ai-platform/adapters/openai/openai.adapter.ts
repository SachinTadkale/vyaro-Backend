import axios from "axios";
import { AiProviderAdapter, AiMessageRole, AiProvider } from "../../types/ai-platform.types";
import { ProviderHealthService } from "../../providers/provider-health.service";

export class OpenAIAdapter implements AiProviderAdapter {
  private getApiKey = () => process.env.OPENAI_API_KEY || "";
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
    const model = options.modelName || "gpt-4o-mini";
    const startTime = Date.now();

    if (!apiKey) {
      const simulatedText = `[SIMULATED OPENAI FALLBACK] OpenAI active in fallback state. Prompt received: "${userPrompt}"`;
      return {
        text: simulatedText,
        tokenUsage: Math.ceil(simulatedText.length / 4),
        responseTimeMs: 80,
        modelUsed: `${model}-simulated`,
      };
    }

    try {
      const messages = [
        { role: "system", content: systemPrompt },
        ...history.map((h) => ({ role: h.role.toLowerCase(), content: h.content })),
        { role: "user", content: userPrompt },
      ];

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 1200,
          response_format: options.responseFormatJson ? { type: "json_object" } : undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 8000,
        }
      );

      const data = response.data;
      const text = data.choices?.[0]?.message?.content || "";
      const totalTokens = data.usage?.total_tokens ?? Math.ceil(text.length / 4);
      const responseTimeMs = Date.now() - startTime;

      this.healthService.recordSuccess(AiProvider.OPENAI, responseTimeMs);

      return {
        text,
        tokenUsage: totalTokens,
        responseTimeMs,
        modelUsed: model,
      };
    } catch (err: any) {
      this.healthService.recordFailure(AiProvider.OPENAI, err.message);
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
    return new Error(`[OpenAIAdapter] ${error.response?.data?.error?.message || error.message}`);
  }
}

import { AiCostEstimate } from "../types/ai-platform.types";

export class AiCostEstimator {
  // Model pricing rates per 1,000,000 (1M) tokens in USD
  private static PRICING_LEDGER: Record<string, { inputRate: number; outputRate: number }> = {
    "deepseek/deepseek-chat-v3-0324:free": { inputRate: 0.0, outputRate: 0.0 }, // free tier
    "deepseek/deepseek-chat": { inputRate: 0.14, outputRate: 0.28 },
    "gemini-1.5-flash": { inputRate: 0.075, outputRate: 0.30 },
    "claude-3-5-sonnet-latest": { inputRate: 3.00, outputRate: 15.00 },
    "gpt-4o-mini": { inputRate: 0.15, outputRate: 0.60 },
  };

  /**
   * Estimates call execution cost based on model and token counts.
   */
  public static calculateCost(
    modelName: string,
    inputTokensCount: number,
    outputTokensCount: number
  ): AiCostEstimate {
    // Find rates or default to a safe moderate cost
    const rates = this.PRICING_LEDGER[modelName] || { inputRate: 0.20, outputRate: 0.60 };

    const inputCost = (inputTokensCount / 1000000) * rates.inputRate;
    const outputCost = (outputTokensCount / 1000000) * rates.outputRate;
    const estimatedCost = parseFloat((inputCost + outputCost).toFixed(6));

    return {
      estimatedCost,
      inputTokens: inputTokensCount,
      outputTokens: outputTokensCount,
      providerRatePerMInput: rates.inputRate,
      providerRatePerMOutput: rates.outputRate,
    };
  }
}

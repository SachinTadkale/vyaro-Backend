import axios from "axios";
import { logger } from "../../../utils/logger";
import { OpenRouterMessage, OpenRouterResponse } from "../types/ai.types";
import { DEFAULT_AI_MODEL, DEFAULT_OPENROUTER_URL } from "../constants/ai.constants";

const getApiKey = () => process.env.OPENROUTER_API_KEY || "";
const getBaseUrl = () => process.env.OPENROUTER_BASE_URL || DEFAULT_OPENROUTER_URL;
const getModel = () => process.env.OPENROUTER_MODEL || DEFAULT_AI_MODEL;

/**
 * Standard call to OpenRouter with a single resolution (Non-streaming).
 * Supports automatic retry once on failure/timeout.
 */
export const callOpenRouter = async (
  messages: OpenRouterMessage[],
  retryCount = 1
): Promise<{ text: string; tokenUsage: number; model: string }> => {
  const apiKey = getApiKey();
  const baseUrl = getBaseUrl();
  const model = getModel();

  if (!apiKey) {
    logger.warn("⚠️ OPENROUTER_API_KEY is not configured! Returning demo warning response.");
    return {
      text: "System Note: OpenRouter API key is missing. Please add OPENROUTER_API_KEY to your server .env file to enable live AI responses.",
      tokenUsage: 0,
      model: "mock-warning-model"
    };
  }

  try {
    const response = await axios.post<OpenRouterResponse>(
      `${baseUrl}/chat/completions`,
      {
        model,
        messages,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://farmzy.com", // Optional metadata for OpenRouter
          "X-Title": "Saira Ai System",
        },
        timeout: 30000, // 30 seconds timeout
      }
    );

    const data = response.data;
    if (data.error) {
      throw new Error(`OpenRouter Error: ${data.error.message} (code: ${data.error.code})`);
    }

    const text = data.choices?.[0]?.message?.content || "";
    const tokenUsage = data.usage?.total_tokens ?? 0;
    const modelUsed = data.model || model;

    return { text, tokenUsage, model: modelUsed };
  } catch (error: any) {
    logger.error("❌ OpenRouter Provider Error:", error.message || error);

    if (retryCount > 0) {
      logger.info(`🔄 Retrying OpenRouter call. Retries left: ${retryCount}`);
      // Wait 2 seconds before retrying
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return callOpenRouter(messages, retryCount - 1);
    }

    throw new Error(
      error.response?.data?.error?.message ||
        error.message ||
        "An unexpected error occurred during OpenRouter call"
    );
  }
};

/**
 * Streams chat completions from OpenRouter via Server-Sent Events (SSE).
 */
export const streamOpenRouter = async (
  messages: OpenRouterMessage[],
  onChunk: (text: string) => void,
  onComplete: (fullText: string, tokenUsage: number, modelUsed: string) => void,
  onError: (err: any) => void
): Promise<void> => {
  const apiKey = getApiKey();
  const baseUrl = getBaseUrl();
  const model = getModel();

  if (!apiKey) {
    const mockMsg = "System Note: OpenRouter API key is missing. Please add OPENROUTER_API_KEY to your server .env file to enable live AI responses.";
    onChunk(mockMsg);
    onComplete(mockMsg, 0, "mock-warning-model");
    return;
  }

  try {
    const response = await axios.post(
      `${baseUrl}/chat/completions`,
      {
        model,
        messages,
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
        timeout: 40000,
      }
    );

    const stream = response.data;
    let fullText = "";
    let modelUsed = model;
    let totalTokens = 0;

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
            
            // Extract tokens if present in the chunk
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
            // Sometimes chunks are cut, we can ignore parse failures for partial lines
          }
        }
      }
    });

    stream.on("end", () => {
      // If totalTokens was not streamed in the JSON usage block, approximate it
      if (totalTokens === 0) {
        totalTokens = Math.ceil((fullText.length / 4) * 1.3); // Approximation: 1 token = 4 characters
      }
      onComplete(fullText, totalTokens, modelUsed);
    });

    stream.on("error", (streamErr: any) => {
      logger.error("❌ OpenRouter Provider Stream Error:", streamErr);
      onError(streamErr);
    });
  } catch (err: any) {
    logger.error("❌ Failed to initiate OpenRouter stream:", err.message || err);
    onError(err);
  }
};

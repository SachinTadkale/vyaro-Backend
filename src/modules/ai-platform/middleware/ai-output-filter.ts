/**
 * Saira AI Platform - Output Safety Filter
 * Purpose: Scrubs LLM completions to prevent accidental leakage of internal system prompt tokens.
 */

export class AiOutputFilter {
  private static SENSITIVE_KEYWORDS = [
    "systemPrompt",
    "system prompt:",
    "Ignore previous instructions",
    "Saira System Rules",
    "as an AI language model",
  ];

  /**
   * Cleans up broken unicode, normalizes spaces, strips invisible characters, and removes redundant phrases/sentences.
   */
  public static sanitizeText(text: string): string {
    if (!text) return "";

    let cleaned = text;

    // 1. Remove broken unicode artifacts and corrupt/random unicode sequences
    cleaned = cleaned.replace(/[\uFFFD\uFFFE\uFFFF]/g, ""); 
    // Allow standard ASCII, Devanagari (Hindi/Marathi), common punctuation, and basic Latin symbols
    cleaned = cleaned.replace(/[^\x00-\x7F\u0900-\u097F\u00A0-\u024F\u2000-\u206F]/g, "");

    // 2. Strip invisible characters and zero-width spaces
    cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, "");

    // 3. Normalize spacing: Replace multiple spaces with a single space, keep single newlines
    cleaned = cleaned.replace(/[ \t]+/g, " ");
    cleaned = cleaned.replace(/\n\s*\n\s*\n+/g, "\n\n"); // Collapse 3+ consecutive newlines

    // 4. Remove repeated words (e.g., "the the", "Saira Saira")
    cleaned = cleaned.replace(/\b(\w+)(?:\s+\1\b)+/gi, "$1");

    // 5. Remove duplicate consecutive sentences
    const sentences = cleaned.split(/(?<=[.!?])\s+/);
    const uniqueSentences: string[] = [];
    for (const s of sentences) {
      const trimmed = s.trim();
      if (!trimmed) continue;
      if (!uniqueSentences.includes(trimmed)) {
        uniqueSentences.push(trimmed);
      }
    }
    cleaned = uniqueSentences.join(" ");

    // 6. Clean up trailing markdown artifacts like incomplete bullet points at the end of streams
    cleaned = cleaned.replace(/[-\*\+]\s*$/g, "");
    
    return cleaned.trim();
  }

  /**
   * Evaluates outgoing LLM text completions.
   */
  public static filterOutput(text: string): {
    isSafe: boolean;
    filteredText: string;
  } {
    if (!text) return { isSafe: true, filteredText: "" };

    let filteredText = this.sanitizeText(text);

    for (const keyword of this.SENSITIVE_KEYWORDS) {
      if (filteredText.toLowerCase().includes(keyword.toLowerCase())) {
        console.warn(`[SECURITY ALERT] Output filter triggered by sensitive keyword: "${keyword}".`);
        // Redact or safely bypass the sensitive block
        const regex = new RegExp(keyword, "gi");
        filteredText = filteredText.replace(regex, "[REDACTED SECURITY BLOCK]");
      }
    }

    return {
      isSafe: true,
      filteredText,
    };
  }
}

/**
 * Standard global helper to sanitize raw AI output responses.
 */
export function sanitizeAIResponse(response: string): string {
  return AiOutputFilter.sanitizeText(response);
}

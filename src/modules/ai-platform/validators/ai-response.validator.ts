/**
 * Saira AI Platform - Response Validator Layer
 * Purpose: Ensures JSON responses from models conform to expected structure templates,
 * mitigating parsing faults and preventing client crashes.
 */

export class AiResponseValidator {
  /**
   * Attempts to parse raw LLM output as JSON.
   * If parsing fails or keys are missing, falls back to a clean JSON repair.
   */
  public static validateJSONResponse<T>(
    rawOutput: string,
    fallbackTemplate: T
  ): {
    isValid: boolean;
    data: T;
    error?: string;
  } {
    const trimmed = rawOutput.trim();
    
    // Check if it looks like a JSON block wrapped in Markdown
    let jsonString = trimmed;
    if (trimmed.startsWith("```json")) {
      const match = trimmed.match(/```json([\s\S]*?)```/);
      if (match && match[1]) {
        jsonString = match[1].trim();
      }
    } else if (trimmed.startsWith("```")) {
      const match = trimmed.match(/```([\s\S]*?)```/);
      if (match && match[1]) {
        jsonString = match[1].trim();
      }
    }

    try {
      const parsed = JSON.parse(jsonString) as T;
      
      // Perform validation keys check against fallback schema keys
      if (typeof parsed === "object" && parsed !== null && typeof fallbackTemplate === "object") {
        const expectedKeys = Object.keys(fallbackTemplate as any);
        const actualKeys = Object.keys(parsed);
        const hasCriticalKeys = expectedKeys.every((key) => actualKeys.includes(key));
        
        if (!hasCriticalKeys) {
          console.warn("[RESPONSE VALIDATOR] JSON missing critical keys. Merging with fallback template.");
          return {
            isValid: false,
            data: { ...fallbackTemplate, ...parsed },
            error: "Missing expected properties",
          };
        }
      }

      return {
        isValid: true,
        data: parsed,
      };
    } catch (err: any) {
      console.error("[RESPONSE VALIDATOR] Failed to parse AI output as JSON:", err.message);
      
      // Attempt manual extraction regex if it's a dirty JSON string
      const objectMatch = jsonString.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        try {
          const repaired = JSON.parse(objectMatch[0]) as T;
          return {
            isValid: true,
            data: repaired,
          };
        } catch (repairErr) {
          // Ignore failure and fall back
        }
      }

      return {
        isValid: false,
        data: fallbackTemplate,
        error: `JSON parsing error: ${err.message}`,
      };
    }
  }
}

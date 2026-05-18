/**
 * Saira AI Platform - Prompt Sanitizer Guardrail
 * Purpose: Neutralizes prompt injection, jailbreak tricks, and system instruction leak hacks.
 */

export class AiPromptSanitizer {
  private static INJECTION_PATTERNS = [
    /ignore\s+(?:any|previous|all)?\s*instructions/i,
    /system\s*prompt/i,
    /ignore\s+above/i,
    /you\s+must\s+now\s+act\s+as/i,
    /dan\s+mode/i,
    /bypass\s+restrictions/i,
    /reveal\s+(?:your)?\s*system/i,
    /tell\s+me\s+your\s+instructions/i,
    /translate\s+the\s+system\s+prompt/i,
    /decode\s+this\s+base64/i,
  ];

  /**
   * Evaluates input prompt for malicious instructions.
   * If an injection is found, strips the harmful segment or raises a guardrail exception.
   */
  public static sanitizeInput(prompt: string): {
    isClean: boolean;
    sanitizedPrompt: string;
    reason?: string;
  } {
    if (!prompt) return { isClean: true, sanitizedPrompt: "" };

    // 1. Basic character trimming & cleaning
    let cleanPrompt = prompt.trim();

    // 2. Scan for system leak/jailbreak pattern matches
    for (const pattern of this.INJECTION_PATTERNS) {
      if (pattern.test(cleanPrompt)) {
        console.warn(`[SECURITY GUARDRAIL] Blocked prompt injection pattern: ${pattern}`);
        return {
          isClean: false,
          sanitizedPrompt: "Blocked: Your query triggers a security guardrail violation.",
          reason: "Prompt Injection / System Prompt Leak Attempt detected.",
        };
      }
    }

    return {
      isClean: true,
      sanitizedPrompt: cleanPrompt,
    };
  }
}

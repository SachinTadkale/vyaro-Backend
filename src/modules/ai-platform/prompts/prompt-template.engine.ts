/**
 * Saira AI Platform - Prompt Template Engine
 * Purpose: Provides a safe, reusable interpolation compiler that replaces curly-brace
 * variables with dynamic, localized contexts.
 */

export class PromptTemplateEngine {
  /**
   * Interpolates prompt templates with dynamic key-value context variables.
   * Ensures safe replacements and outputs standard localized strings.
   */
  public static interpolate(
    template: string,
    contextVariables: Record<string, string | number | undefined>
  ): string {
    if (!template) return "";

    let compiled = template;

    Object.entries(contextVariables).forEach(([key, value]) => {
      const placeholder = `{{${key.toUpperCase()}}}`;
      const stringifiedValue = value !== undefined ? String(value) : `[No ${key} available]`;
      
      // Global regex replace to match all instances in prompt
      const regex = new RegExp(placeholder, "g");
      compiled = compiled.replace(regex, stringifiedValue);
    });

    return compiled;
  }
}

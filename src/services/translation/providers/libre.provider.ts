/**
 * Module: LibreTranslateProvider
 * Purpose: Translation provider backed by a LibreTranslate-compatible API.
 *
 * Features:
 *  - Translates all 3 target languages in parallel (Promise.all)
 *  - Per-language fallback: a single lang failure does NOT fail the whole request
 *  - Supports optional API key for hosted LibreTranslate instances
 *  - Configurable timeout via TRANSLATE_TIMEOUT env var
 */
import axios from "axios";
import { TranslationProvider, SupportedLang } from "../translation.interface";

export class LibreTranslateProvider implements TranslationProvider {
  private readonly apiUrl: string;
  private readonly apiKey: string | undefined;
  private readonly timeoutMs: number;

  constructor(apiUrl: string, apiKey?: string, timeoutMs = 5000) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
  }

  async translate(
    text: string,
    targetLangs: SupportedLang[]
  ): Promise<Record<SupportedLang, string>> {
    const results = {} as Record<SupportedLang, string>;

    await Promise.all(
      targetLangs.map(async (lang) => {
        try {
          const res = await axios.post(
            this.apiUrl,
            {
              q: text,
              source: "auto",
              target: lang,
              format: "text",
              ...(this.apiKey ? { api_key: this.apiKey } : {}),
            },
            { timeout: this.timeoutMs }
          );

          results[lang] = typeof res.data?.translatedText === "string"
            ? res.data.translatedText
            : text; // guard against unexpected response shape
        } catch {
          // Per-language fallback — does not fail sibling languages
          results[lang] = text;
        }
      })
    );

    return results;
  }
}
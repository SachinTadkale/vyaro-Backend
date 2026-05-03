/**
 * Module: Translation Interface
 * Purpose: Shared types and provider contract for the FarmZy multilingual system.
 *
 * TranslationType routing rules:
 *  PRODUCT  → check dictionary → call API → store in dictionary
 *  CATEGORY → check dictionary → call API → store in dictionary
 *  ADDRESS  → call API → store on entity (NOT in dictionary)
 *  MESSAGE  → call API on-demand → do NOT store anywhere
 *  SYSTEM   → handled entirely on the frontend via JSON bundles
 */

// ─── Supported Languages ────────────────────────────────────────────────────

export type SupportedLang = "en" | "hi" | "mr";

export const SUPPORTED_LANGS: SupportedLang[] = ["en", "hi", "mr"];

export const DEFAULT_LANG: SupportedLang = "en";

// ─── Translation Classification ─────────────────────────────────────────────

export type TranslationType =
  | "PRODUCT"   // product names, crop names → dictionary + cache
  | "CATEGORY"  // product categories         → dictionary + cache
  | "ADDRESS"   // user/farm addresses         → API only, store on entity
  | "MESSAGE"   // runtime messages            → API only, never persisted
  | "SYSTEM";   // status labels, enums        → frontend JSON only (not handled here)

// ─── Translation Result ──────────────────────────────────────────────────────

/**
 * A fully resolved multilingual string.
 * Every field is always present — guaranteed by the fallback chain (mr → hi → en).
 */
export interface TranslationResult {
  en: string;
  hi: string;
  mr: string;
}

/**
 * Builds a safe fallback result where all languages return the original text.
 */
export const fallbackResult = (text: string): TranslationResult => ({
  en: text,
  hi: text,
  mr: text,
});

// ─── Provider Contract ───────────────────────────────────────────────────────

/**
 * All translation providers must implement this interface.
 * The provider is selected at startup via TranslationFactory.
 */
export interface TranslationProvider {
  /**
   * Translate `text` into each of the given `targetLangs`.
   * Returns a map of lang → translated string.
   * On per-language failure, the map entry should equal the original `text`.
   */
  translate(
    text: string,
    targetLangs: SupportedLang[]
  ): Promise<Record<SupportedLang, string>>;
}
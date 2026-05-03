/**
 * Module: TranslationService
 * Purpose: Central multilingual translation engine for FarmZy.
 *
 * Routing by type:
 *  PRODUCT  → in-memory cache → TranslationDictionary (DB) → provider API → store in DB
 *  CATEGORY → in-memory cache → TranslationDictionary (DB) → provider API → store in DB
 *  ADDRESS  → provider API only → caller stores result on the entity (NOT in dictionary)
 *  MESSAGE  → provider API only → result is ephemeral, never persisted
 *  SYSTEM   → NOT handled here (frontend JSON bundles)
 *
 * Fallback chain (mr → hi → en):
 *  If a language translation is missing or empty, the service falls back to
 *  the next language in the chain before finally returning the original text.
 *
 * Performance:
 *  - In-memory Map cache (PRODUCT / CATEGORY) is keyed by normalized text.
 *  - Cache is warm across requests until server restart.
 *  - TODO: replace Map cache with Redis in scaling phase (horizontal multi-instance).
 */
import prisma from "../../config/prisma";
import {
  TranslationType,
  TranslationResult,
  SupportedLang,
  SUPPORTED_LANGS,
  fallbackResult,
} from "./translation.interface";
import { createTranslationProvider } from "./translation.factory";

// ─── Provider (singleton, initialized lazily) ────────────────────────────────

let _provider: ReturnType<typeof createTranslationProvider> | null = null;

const getProvider = () => {
  if (!_provider) {
    _provider = createTranslationProvider();
  }
  return _provider;
};

// ─── In-Memory Cache ─────────────────────────────────────────────────────────
// TODO: replace Map cache with Redis in scaling phase (horizontal multi-instance)

const translationCache = new Map<string, TranslationResult>();

const cacheKey = (text: string): string => normalize(text);

// ─── Normalization ───────────────────────────────────────────────────────────

/**
 * Normalizes text for use as a dictionary key.
 * Trims whitespace and lowercases — ensures "Tomato" and "tomato" share one entry.
 */
const normalize = (text: string): string => text.trim().toLowerCase();

// ─── Fallback Chain Resolver ─────────────────────────────────────────────────

/**
 * Applies the mr → hi → en fallback chain to a raw provider result.
 * Ensures every language slot is populated even when the API returns empty/null.
 */
const applyFallbackChain = (
  raw: Record<string, string>,
  originalText: string
): TranslationResult => {
  const en = raw["en"]?.trim() || originalText;
  const hi = raw["hi"]?.trim() || en;
  const mr = raw["mr"]?.trim() || hi;

  return { en, hi, mr };
};

// ─── Dictionary Helpers ──────────────────────────────────────────────────────

const lookupDictionary = async (key: string): Promise<TranslationResult | null> => {
  try {
    const entry = await prisma.translationDictionary.findUnique({
      where: { key },
      select: { en: true, hi: true, mr: true },
    });

    if (!entry) return null;

    // Increment usage count (fire-and-forget — must not block the response)
    prisma.translationDictionary
      .update({ where: { key }, data: { usageCount: { increment: 1 } } })
      .catch(() => {}); // silent — non-critical

    return { en: entry.en, hi: entry.hi, mr: entry.mr };
  } catch {
    return null; // DB failure must not crash the translation flow
  }
};

const storeDictionary = async (
  original: string,
  key: string,
  result: TranslationResult
): Promise<void> => {
  try {
    await prisma.translationDictionary.upsert({
      where: { key },
      create: {
        key,
        original,
        en: result.en,
        hi: result.hi,
        mr: result.mr,
        usageCount: 1,
      },
      update: {
        en: result.en,
        hi: result.hi,
        mr: result.mr,
        usageCount: { increment: 1 },
      },
    });
  } catch {
    // Non-critical — if we can't store it, we still return the result.
  }
};

// ─── Core Translation Function ───────────────────────────────────────────────

/**
 * Translates `text` into all three supported languages based on `type`.
 *
 * Rules:
 *  - PRODUCT / CATEGORY: cache → dictionary → API → store
 *  - ADDRESS / MESSAGE:  API only (no caching, no dictionary)
 *  - SYSTEM:             Not handled — returns fallback immediately
 *
 * Never throws. Returns `fallbackResult(text)` on any unrecoverable error.
 */
export const translateText = async (
  text: string,
  type: TranslationType
): Promise<TranslationResult> => {
  if (!text || !text.trim()) {
    return fallbackResult(text ?? "");
  }

  try {
    switch (type) {
      case "SYSTEM":
        // Handled by frontend JSON bundles — not our responsibility
        return fallbackResult(text);

      case "PRODUCT":
      case "CATEGORY": {
        const key = cacheKey(text);

        // 1. In-memory cache hit
        const cached = translationCache.get(key);
        if (cached) return cached;

        // 2. Dictionary (DB) hit
        const dictResult = await lookupDictionary(key);
        if (dictResult) {
          translationCache.set(key, dictResult);
          return dictResult;
        }

        // 3. Call translation API
        const raw = await getProvider().translate(text, SUPPORTED_LANGS);
        const result = applyFallbackChain(raw, text);

        // 4. Store in dictionary and cache (fire-and-forget on store)
        storeDictionary(text, key, result).catch(() => {});
        translationCache.set(key, result);

        return result;
      }

      case "ADDRESS":
      case "MESSAGE": {
        // API only — no dictionary, no cache
        const raw = await getProvider().translate(text, SUPPORTED_LANGS);
        return applyFallbackChain(raw, text);
      }

      default:
        return fallbackResult(text);
    }
  } catch {
    // Top-level safety net — translation failure must never crash a request
    return fallbackResult(text);
  }
};

// ─── Convenience: Translate an Address ───────────────────────────────────────

/**
 * Translates an address string and returns the localized variants.
 * Result is meant to be stored on the entity (User.addressLocal / FarmDetails.addressLocal).
 * Uses the ADDRESS type — never stored in the dictionary.
 *
 * Returns:
 *  { hi: "...", mr: "..." }
 *  (English is assumed to be the original; only local variants are stored)
 */
export const translateAddress = async (
  address: string
): Promise<{ hi: string; mr: string }> => {
  const result = await translateText(address, "ADDRESS");
  return { hi: result.hi, mr: result.mr };
};

// ─── Convenience: Translate a System Message ─────────────────────────────────

/**
 * Translates a runtime message string (e.g. success/error messages from services).
 * Never stored. Returns a full TranslationResult.
 */
export const translateMessage = async (
  message: string
): Promise<TranslationResult> => {
  return translateText(message, "MESSAGE");
};

// ─── Cache Utilities (test/admin use) ────────────────────────────────────────

/** Clears the in-memory translation cache. Useful in tests. */
export const clearTranslationCache = (): void => {
  translationCache.clear();
};

/** Returns the number of entries currently in the in-memory cache. */
export const getCacheSize = (): number => translationCache.size;
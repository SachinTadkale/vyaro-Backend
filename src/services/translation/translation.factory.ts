/**
 * Module: TranslationFactory
 * Purpose: Selects and constructs the active translation provider at startup.
 *
 * Provider is controlled via:
 *   TRANSLATE_PROVIDER = "libre" | "google"   (default: "libre")
 *
 * Provider-specific env vars:
 *   TRANSLATE_API_URL    — LibreTranslate endpoint
 *   TRANSLATE_API_KEY    — API key (LibreTranslate hosted / Google Cloud)
 *   TRANSLATE_TIMEOUT    — Request timeout in ms (default: 5000)
 */
import { TranslationProvider } from "./translation.interface";
import { LibreTranslateProvider } from "./providers/libre.provider";
import { GoogleTranslateProvider } from "./providers/google.provider";

export const createTranslationProvider = (): TranslationProvider => {
  const providerName = (process.env.TRANSLATE_PROVIDER ?? "libre").toLowerCase();
  const apiKey = process.env.TRANSLATE_API_KEY;
  const timeoutMs = Number(process.env.TRANSLATE_TIMEOUT) || 5000;

  switch (providerName) {
    case "google": {
      if (!apiKey) {
        throw new Error(
          "[TranslationFactory] TRANSLATE_API_KEY is required for the Google provider."
        );
      }
      return new GoogleTranslateProvider(apiKey);
    }

    case "libre":
    default: {
      const apiUrl = process.env.TRANSLATE_API_URL;
      if (!apiUrl) {
        throw new Error(
          "[TranslationFactory] TRANSLATE_API_URL is required for the LibreTranslate provider."
        );
      }
      return new LibreTranslateProvider(apiUrl, apiKey, timeoutMs);
    }
  }
};
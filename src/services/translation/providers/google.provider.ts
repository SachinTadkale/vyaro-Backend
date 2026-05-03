/**
 * Module: GoogleTranslateProvider (stub)
 * Purpose: Future translation provider backed by Google Cloud Translate v2.
 *
 * HOW TO ACTIVATE:
 *  1. Install:  npm install @google-cloud/translate
 *  2. Set env:  TRANSLATE_PROVIDER=google
 *               GOOGLE_TRANSLATE_API_KEY=<your key>
 *  3. Uncomment the implementation below and remove the stub body.
 *
 * NOTE: This file is intentionally a stub. Do NOT import @google-cloud/translate
 *       until the package is installed.
 */
import { TranslationProvider, SupportedLang } from "../translation.interface";

export class GoogleTranslateProvider implements TranslationProvider {
  // private readonly client: Translate;

  constructor(_apiKey: string) {
    // TODO (scaling phase): initialize @google-cloud/translate Translate client
    // this.client = new Translate({ key: _apiKey });
  }

  async translate(
    text: string,
    targetLangs: SupportedLang[]
  ): Promise<Record<SupportedLang, string>> {
    // TODO (scaling phase): implement Google Translate API calls
    //
    // const results = {} as Record<SupportedLang, string>;
    // await Promise.all(
    //   targetLangs.map(async (lang) => {
    //     try {
    //       const [translation] = await this.client.translate(text, lang);
    //       results[lang] = translation;
    //     } catch {
    //       results[lang] = text;
    //     }
    //   })
    // );
    // return results;

    // Stub fallback — returns original text for all langs
    return targetLangs.reduce((acc, lang) => {
      acc[lang] = text;
      return acc;
    }, {} as Record<SupportedLang, string>);
  }
}

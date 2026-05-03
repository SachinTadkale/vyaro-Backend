/**
 * Module: LangMiddleware
 * Purpose: Reads the `x-lang` request header and attaches `req.lang` for downstream use.
 *
 * Rules:
 *  - Valid values: "en" | "hi" | "mr"
 *  - Missing or invalid header → defaults to "en" (never rejects the request)
 *  - Value is lowercased and trimmed before validation
 *
 * Usage:
 *  expressApp.use(langMiddleware); // registered globally in app.ts
 *
 * Frontend contract:
 *  All API calls must include:  x-lang: en | hi | mr
 */
import { Request, Response, NextFunction } from "express";
import {
  SupportedLang,
  SUPPORTED_LANGS,
  DEFAULT_LANG,
} from "../services/translation/translation.interface";

export const langMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const raw = req.headers["x-lang"];
  const candidate = (Array.isArray(raw) ? raw[0] : raw)?.trim().toLowerCase();

  req.lang = (
    candidate && (SUPPORTED_LANGS as string[]).includes(candidate)
      ? candidate
      : DEFAULT_LANG
  ) as SupportedLang;

  next();
};

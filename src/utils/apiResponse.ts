/**
 * Module: ApiResponse Helpers
 * Purpose: Standardized multilingual response builders for FarmZy controllers.
 *
 * Every API response follows the contract:
 * {
 *   success : boolean,
 *   data    : T | null,
 *   message : { en, hi, mr } | string,   ← TranslationResult for dynamic messages
 *   meta    : { lang: "en" | "hi" | "mr" }
 * }
 *
 * Usage:
 *   sendSuccess(res, req.lang, data, messageResult);
 *   sendError(res, req.lang, 400, "Bad Request", errorResult);
 *
 * NOTE:
 *  - `message` is the full TranslationResult object — the frontend picks its own language key.
 *  - For simple string messages (backward-compatible), pass a plain string and it will be
 *    wrapped into a TranslationResult where all three languages equal that string.
 */
import { Response } from "express";
import { SupportedLang, TranslationResult } from "../services/translation/translation.interface";

// ─── Types ───────────────────────────────────────────────────────────────────

type MessageInput = TranslationResult | string;

interface SuccessResponseOptions<T> {
  res: Response;
  lang: SupportedLang;
  data?: T;
  message?: MessageInput;
  statusCode?: number;
  meta?: Record<string, unknown>;
}

interface ErrorResponseOptions {
  res: Response;
  lang: SupportedLang;
  statusCode: number;
  message: MessageInput;
  code?: string;
  details?: unknown;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const resolveMessage = (input?: MessageInput): TranslationResult | undefined => {
  if (!input) return undefined;
  if (typeof input === "string") return { en: input, hi: input, mr: input };
  return input;
};

// ─── sendSuccess ─────────────────────────────────────────────────────────────

/**
 * Sends a 2xx success response with a multilingual message envelope.
 */
export const sendSuccess = <T>({
  res,
  lang,
  data,
  message,
  statusCode = 200,
  meta = {},
}: SuccessResponseOptions<T>): void => {
  const resolvedMessage = resolveMessage(message);

  res.status(statusCode).json({
    success: true,
    ...(resolvedMessage !== undefined ? { message: resolvedMessage } : {}),
    ...(data !== undefined ? { data } : {}),
    meta: {
      lang,
      ...meta,
    },
  });
};

// ─── sendError ───────────────────────────────────────────────────────────────

/**
 * Sends a 4xx/5xx error response with a multilingual message envelope.
 */
export const sendError = ({
  res,
  lang,
  statusCode,
  message,
  code,
  details,
}: ErrorResponseOptions): void => {
  const resolvedMessage = resolveMessage(message);

  res.status(statusCode).json({
    success: false,
    message: resolvedMessage,
    ...(code ? { code } : {}),
    ...(details ? { details } : {}),
    meta: { lang },
  });
};

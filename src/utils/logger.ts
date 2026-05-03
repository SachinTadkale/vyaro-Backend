/**
 * Module: Logger
 * Purpose: Implements the Logger module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Logger.
 */
export const logger = pino(
  isDev
    ? {
        level: "debug",
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
          },
        },
      }
    : {
        level: "info",
      }
);
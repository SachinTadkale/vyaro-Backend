import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);

export const chatInputSchema = z.object({
  message: nonEmptyString.max(5000, "Message cannot exceed 5000 characters"),
  sessionId: z.string().trim().optional(),
  language: z.enum(["en", "hi", "mr"]).default("en")
});

export const badgePromptSchema = z.object({
  badgeLabel: nonEmptyString,
  language: z.enum(["en", "hi", "mr"]).default("en")
});

export const sessionParamSchema = z.object({
  id: nonEmptyString
});

export type ChatInput = z.infer<typeof chatInputSchema>;
export type BadgePromptInput = z.infer<typeof badgePromptSchema>;

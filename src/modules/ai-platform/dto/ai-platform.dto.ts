import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);

export const sairaChatInputSchema = z.object({
  wrapperKey: z.string().trim().optional(),
  userPrompt: z.string().trim().optional(),
  message: z.string().trim().optional(),
  sessionId: z.string().trim().optional(),
  language: z.enum(["en", "hi", "mr"]).default("en"),
  context: z.record(z.string(), z.any()).optional(),
}).superRefine((data, ctx) => {
  if (!data.userPrompt && !data.message) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Either userPrompt or message must be provided",
      path: ["userPrompt"],
    });
  }
});

export const sairaBadgePromptSchema = z.object({
  badgeLabel: nonEmptyString,
  language: z.enum(["en", "hi", "mr"]).default("en"),
});

export const sairaSessionParamSchema = z.object({
  id: nonEmptyString,
});

export type SairaChatInput = z.infer<typeof sairaChatInputSchema>;
export type SairaBadgePromptInput = z.infer<typeof sairaBadgePromptSchema>;

import { z } from "zod";

export const createLeadSchema = z.object({
  email: z.email("email must be a valid email address").trim().toLowerCase(),
  role: z.enum(["FARMER", "COMPANY"]),
  name: z.string().trim().min(2, "name must be at least 2 characters").optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

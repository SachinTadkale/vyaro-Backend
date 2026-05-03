/**
 * Module: Leads.validation
 * Purpose: Implements the Leads.validation module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { z } from "zod";

/**
 * Create Lead Schema.
 */
export const createLeadSchema = z.object({
  email: z.email("email must be a valid email address").trim().toLowerCase(),
  role: z.enum(["FARMER", "COMPANY"]),
  name: z.string().trim().min(2, "name must be at least 2 characters").optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

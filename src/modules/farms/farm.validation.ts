/**
 * Module: Farm.validation
 * Purpose: Implements the Farm.validation module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { z } from "zod";

/**
 * Farm Schema.
 */
export const farmSchema = z.object({
  state: z.string().min(2),
  district: z.string(),
  village: z.string(),
  pincode: z.string().length(6),
  landArea: z.number().optional(),
});
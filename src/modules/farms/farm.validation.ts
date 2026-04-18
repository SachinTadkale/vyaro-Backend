import { z } from "zod";

export const farmSchema = z.object({
  state: z.string().min(2),
  district: z.string(),
  village: z.string(),
  pincode: z.string().length(6),
  landArea: z.number().optional(),
});
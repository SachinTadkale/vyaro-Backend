/**
 * Module: Kyc.validation
 * Purpose: Implements the Kyc.validation module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { z } from "zod";

/**
 * Kyc Schema.
 */
export const kycSchema = z.object({
  docType: z.enum([
    "AADHAAR",
    "PAN",
    "DRIVING_LICENSE",
    "VEHICLE_RC",
  ]),
  docNo: z.string().optional(),
});
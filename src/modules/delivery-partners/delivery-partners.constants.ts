/**
 * Module: Delivery Partners.constants
 * Purpose: Implements the Delivery Partners.constants module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { DeliveryStatus, UserRole } from "@prisma/client";

/**
 * Delivery Partner Role.
 */
export const DELIVERY_PARTNER_ROLE = UserRole.DELIVERY_PARTNER;

/**
 * Delivery Partner Error Codes.
 */
export const DELIVERY_PARTNER_ERROR_CODES = {
  INVALID_ROLE: "INVALID_ROLE",
  PROFILE_ALREADY_EXISTS: "PROFILE_ALREADY_EXISTS",
  PROFILE_NOT_FOUND: "PROFILE_NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_INPUT: "INVALID_INPUT",
} as const;

/**
 * Job Excluded Statuses.
 */
export const JOB_EXCLUDED_STATUSES: DeliveryStatus[] = [
  DeliveryStatus.DELIVERED,
  DeliveryStatus.CANCELLED,
  DeliveryStatus.FAILED,
];

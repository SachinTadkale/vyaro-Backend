/**
 * Module: Marketplace.constants
 * Purpose: Implements the Marketplace.constants module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
/**
 * Default Listings Page.
 */
export const DEFAULT_LISTINGS_PAGE = 1;
export const DEFAULT_LISTINGS_LIMIT = 10;
/**
 * Max Listings Limit.
 */
export const MAX_LISTINGS_LIMIT = 100;
export const DEFAULT_GEO_RADIUS_KM = 50;
/**
 * Max Geo Radius Km.
 */
export const MAX_GEO_RADIUS_KM = 500;
export const EARTH_RADIUS_KM = 6371;

/**
 * Marketplace Rate Limits.
 */
export const MARKETPLACE_RATE_LIMITS = {
  normalRead: {
    keyPrefix: "marketplace:read",
    windowMs: 60 * 1000,
    maxRequests: 120,
  },
  geoRead: {
    keyPrefix: "marketplace:geo-read",
    windowMs: 60 * 1000,
    maxRequests: 40,
  },
} as const;

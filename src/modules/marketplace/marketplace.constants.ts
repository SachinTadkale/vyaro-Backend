export const DEFAULT_LISTINGS_PAGE = 1;
export const DEFAULT_LISTINGS_LIMIT = 10;
export const MAX_LISTINGS_LIMIT = 100;
export const DEFAULT_GEO_RADIUS_KM = 50;
export const MAX_GEO_RADIUS_KM = 500;
export const EARTH_RADIUS_KM = 6371;

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

/**
 * Module: Marketplace.routes
 * Purpose: Implements the Marketplace.routes module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
import { Router } from "express";
import { authMiddleware } from "../../../middleware/auth.middleware";
import { createRateLimiter } from "../../../middleware/rateLimit.middleware";
import { requireActor } from "../../../middleware/rbac.middleware";
import { verifiedOnly } from "../../../middleware/verification.middleware";
import { MARKETPLACE_RATE_LIMITS } from "../marketplace.constants";
import {
  createListing,
  deleteListing,
  getMarketplaceListings,
  getMyListings,
  getSingleListing,
  updateListing,
} from "./marketplace.controller";

const router = Router();
const marketplaceReadLimiter = createRateLimiter(
  MARKETPLACE_RATE_LIMITS.normalRead,
);
const marketplaceGeoReadLimiter = createRateLimiter(
  MARKETPLACE_RATE_LIMITS.geoRead,
);

const marketplaceReadModeLimiter = (
  req: Parameters<typeof marketplaceReadLimiter>[0],
  res: Parameters<typeof marketplaceReadLimiter>[1],
  next: Parameters<typeof marketplaceReadLimiter>[2],
) => {
  const hasLat = req.query.lat !== undefined;
  const hasLng = req.query.lng !== undefined;
  const limiter =
    hasLat || hasLng ? marketplaceGeoReadLimiter : marketplaceReadLimiter;

  return limiter(req, res, next);
};

router.get(
  "/listings/search",
  authMiddleware,
  marketplaceReadModeLimiter,
  getMarketplaceListings,
);

router.get(
  "/getListings",
  authMiddleware,
  marketplaceReadModeLimiter,
  getMarketplaceListings,
);
router.get(
  "/getListingById/:id",
  authMiddleware,
  marketplaceReadModeLimiter,
  getSingleListing,
);

router.post(
  "/addListing",
  authMiddleware,
  requireActor("FARMER"),
  verifiedOnly,
  createListing,
);

router.patch(
  "/updateListing/:id",
  authMiddleware,
  requireActor("FARMER"),
  updateListing,
);

router.delete(
  "/deleteListing/:id",
  authMiddleware,
  requireActor("FARMER"),
  deleteListing,
);

router.get("/my-listings", authMiddleware, requireActor("FARMER"), getMyListings);

export default router;

import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requireActor } from "../../middleware/rbac.middleware";
import { verifiedOnly } from "../../middleware/verification.middleware";
import {
  createListing,
  deleteListing,
  getMarketplaceListings,
  getMyListings,
  getSingleListing,
  updateListing,
} from "./marketplace.controller";

const router = Router();

router.get("/listings", authMiddleware, getMarketplaceListings);
router.get("/listings/:id", authMiddleware, getSingleListing);

router.post(
  "/listings",
  authMiddleware,
  requireActor("USER"),
  verifiedOnly,
  createListing
);

router.patch(
  "/listings/:id",
  authMiddleware,
  requireActor("USER"),
  updateListing
);

router.delete(
  "/listings/:id",
  authMiddleware,
  requireActor("USER"),
  deleteListing
);

router.get(
  "/my-listings",
  authMiddleware,
  requireActor("USER"),
  getMyListings
);

export default router;

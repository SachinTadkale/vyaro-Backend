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

router.get("/getListings", authMiddleware, getMarketplaceListings);
router.get("/getListingById/:id", authMiddleware, getSingleListing);

router.post(
  "/addListing",
  authMiddleware,
  requireActor("USER"),
  verifiedOnly,
  createListing,
);

router.patch(
  "/updateListing/:id",
  authMiddleware,
  requireActor("USER"),
  updateListing,
);

router.delete(
  "/deleteListing/:id",
  authMiddleware,
  requireActor("USER"),
  deleteListing,
);

router.get("/my-listings", authMiddleware, requireActor("USER"), getMyListings);

export default router;

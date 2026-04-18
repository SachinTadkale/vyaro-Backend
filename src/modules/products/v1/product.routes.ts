import { Router } from "express";
import {
  createProduct,
  getMyProducts,
  updateProduct,
  deleteProduct,
} from "./product.controller";
import { authMiddleware } from "../../../middleware/auth.middleware";
import { verifiedOnly } from "../../../middleware/verification.middleware";
import { upload } from "../../../middleware/upload.middleware";
import { createRateLimiter } from "../../../middleware/rateLimit.middleware";

const router = Router();
const productWriteLimiter = createRateLimiter({
  keyPrefix: "product-write",
  windowMs: 60 * 1000,
  maxRequests: 20,
});
const productReadLimiter = createRateLimiter({
  keyPrefix: "product-read",
  windowMs: 60 * 1000,
  maxRequests: 120,
});

//////////////////////////////////////
// USER ROUTES ONLY
//////////////////////////////////////

router.post(
  "/add-product",
  authMiddleware,
  verifiedOnly,
  productWriteLimiter,
  upload.single("productImage"),
  createProduct
);

router.get(
  "/get-product",
  authMiddleware,
  verifiedOnly,
  productReadLimiter,
  getMyProducts
);

router.patch(
  "/udpate-product/:id",
  authMiddleware,
  verifiedOnly,
  productWriteLimiter,
  upload.single("productImage"),
  updateProduct
);

router.delete(
  "/delete-product/:id",
  authMiddleware,
  verifiedOnly,
  productWriteLimiter,
  deleteProduct
);

export default router;

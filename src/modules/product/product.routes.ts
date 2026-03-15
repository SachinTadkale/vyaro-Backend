import { Router } from "express";
import {
  createProduct,
  getMyProducts,
  updateProduct,
  deleteProduct,
} from "./product.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { verifiedOnly } from "../../middleware/verification.middleware";
import { upload } from "../../middleware/upload.middleware";

const router = Router();

//////////////////////////////////////
// USER ROUTES ONLY
//////////////////////////////////////

router.post(
  "/add-product",
  authMiddleware,
  verifiedOnly,
  upload.single("productImage"),
  createProduct
);

router.get(
  "/get-product",
  authMiddleware,
  verifiedOnly,
  getMyProducts
);

router.patch(
  "/udpate-product/:id",
  authMiddleware,
  upload.single("productImage"),
  updateProduct
);

router.delete(
  "/delete-product/:id",
  authMiddleware,
  deleteProduct
);

export default router;
import { Router } from "express";
import {
  createProduct,
  getMyProducts,
  updateProduct,
  deleteProduct,
} from "./product.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { verifiedOnly } from "../../middleware/verification.middleware";
import { upload } from "../upload/upload.middleware";

const router = Router();

//////////////////////////////////////
// USER ROUTES ONLY
//////////////////////////////////////

router.post(
  "/",
  authMiddleware,
  verifiedOnly,
  upload.single("productImage"),
  createProduct
);

router.get(
  "/my",
  authMiddleware,
  verifiedOnly,
  getMyProducts
);

router.patch(
  "/:id",
  authMiddleware,
  upload.single("productImage"),
  updateProduct
);

router.delete(
  "/:id",
  authMiddleware,
  deleteProduct
);

export default router;
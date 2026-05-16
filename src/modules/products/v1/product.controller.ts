/**
 * Module: Product.controller
 * Purpose: Implements the Product.controller module for FarmZy.
 *
 * i18n:
 *  - All mutating operations return message as a TranslationResult { en, hi, mr }
 *  - All responses include meta: { lang } from the x-lang header
 *  - Frontend picks data.translations?[lang] ?? data.productName for display
 */
import { Request, Response } from "express";
import asyncHandler from "../../../utils/asyncHandler";
import * as productService from "../product.service";
import { uploadToCloudinary } from "../../../config/cloudinary";
import { translateMessage } from "../../../services/translation/translation.service";

//////////////////////////////////////
// CREATE PRODUCT
//////////////////////////////////////

/**
 * Create Product.
 */
export const createProduct = asyncHandler(
  async (req: Request, res: Response) => {
    let imageUrl: string | undefined;

    if (req.file) {
      const upload = await uploadToCloudinary(req.file.path);
      imageUrl = upload.url;
    }

    const result = await productService.createProduct(
      req.user.userId,
      req.body,
      imageUrl,
    );

    // Translate the success message dynamically for the response
    const message = await translateMessage(result.message);

    res.status(201).json({
      success: true,
      message,
      data: result.product,
      meta: { lang: req.lang },
    });
  },
);

//////////////////////////////////////
// GET MY PRODUCTS
//////////////////////////////////////

/**
 * Get My Products.
 */
export const getMyProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const products = await productService.getMyProducts(req.user.userId);

    res.status(200).json({
      success: true,
      data: products,
      meta: { lang: req.lang },
    });
  },
);

//////////////////////////////////////
// UPDATE PRODUCT
//////////////////////////////////////

/**
 * Update Product.
 */
export const updateProduct = asyncHandler(
  async (req: Request, res: Response) => {
    let imageUrl: string | undefined;

    if (req.file) {
      const upload = await uploadToCloudinary(req.file.path);
      imageUrl = upload.url;
    }

    const result = await productService.updateProduct(
      req.params.id,
      req.user.userId,
      req.body,
      imageUrl,
    );

    const message = await translateMessage(result.message);

    res.status(200).json({
      success: true,
      message,
      data: result.product,
      meta: { lang: req.lang },
    });
  },
);

//////////////////////////////////////
// DELETE PRODUCT
//////////////////////////////////////

/**
 * Delete Product.
 */
export const deleteProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await productService.deleteProduct(
      req.params.id,
      req.user.userId,
    );

    const message = await translateMessage(result.message);

    res.status(200).json({
      success: true,
      message,
      meta: { lang: req.lang },
    });
  },
);

//////////////////////////////////////
// GET PRODUCT UNITS
//////////////////////////////////////

/**
 * Get Available Product Units.
 */
export const getProductUnits = asyncHandler(
  async (req: Request, res: Response) => {
    const units = productService.getProductUnits();

    res.status(200).json({
      success: true,
      data: units,
      meta: { lang: req.lang },
    });
  },
);

//////////////////////////////////////
// GET CATEGORIES WITH UNITS
//////////////////////////////////////

/**
 * Get Product Categories and their Allowed Units.
 */
export const getCategoriesWithUnits = asyncHandler(
  async (req: Request, res: Response) => {
    const categories = productService.getCategoriesWithUnits();

    res.status(200).json({
      success: true,
      data: categories,
      meta: { lang: req.lang },
    });
  },
);

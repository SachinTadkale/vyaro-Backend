import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import * as productService from "./product.service";
import { uploadToCloudinary } from "../../config/cloudinary";

//////////////////////////////////////
// CREATE PRODUCT
//////////////////////////////////////
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

    res.status(201).json({
      success: true,
      message: result.message,
      data: result.product,
    });
  },
);

//////////////////////////////////////
// GET MY PRODUCTS
//////////////////////////////////////

export const getMyProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const products = await productService.getMyProducts(req.user.userId);

    res.status(200).json({
      success: true,
      data: products,
    });
  },
);

//////////////////////////////////////
// UPDATE PRODUCT
//////////////////////////////////////

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

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.product,
    });
  },
);

//////////////////////////////////////
// DELETE PRODUCT
//////////////////////////////////////

export const deleteProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await productService.deleteProduct(
      req.params.id,
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      message: result.message,
    });
  },
);

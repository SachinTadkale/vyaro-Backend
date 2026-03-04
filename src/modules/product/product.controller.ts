import { Response } from "express";
import * as productService from "./product.service";
import { uploadToCloudinary } from "../../lib/cloudinary";

//////////////////////////////////////
// CREATE PRODUCT
//////////////////////////////////////

export const createProduct = async (
  req: any,
  res: Response
) => {
  try {
    let imageUrl: string | undefined;

    if (req.file) {
      const upload = await uploadToCloudinary(req.file.path);
      imageUrl = upload.url;
    }

    const result = await productService.createProduct(
      req.user.userId,
      req.body,
      imageUrl
    );

    return res.status(201).json({
      success: true,
      message: result.message,
      data: result.product,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////
// GET MY PRODUCTS
//////////////////////////////////////

export const getMyProducts = async (
  req: any,
  res: Response
) => {
  try {
    const products = await productService.getMyProducts(
      req.user.userId
    );

    return res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////
// UPDATE PRODUCT
//////////////////////////////////////

export const updateProduct = async (
  req: any,
  res: Response
) => {
  try {
    let imageUrl: string | undefined;

    if (req.file) {
      const upload = await uploadToCloudinary(req.file.path);
      imageUrl = upload.url;
    }

    const product =
      await productService.updateProduct(
        req.params.id,
        req.user.userId,
        req.body,
        imageUrl
      );

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

//////////////////////////////////////
// DELETE PRODUCT
//////////////////////////////////////

export const deleteProduct = async (
  req: any,
  res: Response
) => {
  try {
    const result =
      await productService.deleteProduct(
        req.params.id,
        req.user.userId
      );

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
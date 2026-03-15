import prisma from "../../config/prisma";
import ApiError from "../../utils/apiError";
import { CreateProductDTO, UpdateProductDTO } from "./product.type";

//////////////////////////////////////
// CREATE PRODUCT
//////////////////////////////////////

export const createProduct = async (
  userId: string,
  data: CreateProductDTO,
  imageUrl?: string,
) => {
  const product = await prisma.product.create({
    data: {
      productName: data.productName,
      category: data.category,
      unit: data.unit,
      productImage: imageUrl,
      userId,
    },
    select: {
      productId: true,
      productName: true,
      category: true,
      unit: true,
      productImage: true,
      userId: true,
    },
  });

  return {
    message: "Product created successfully",
    product,
  };
};

//////////////////////////////////////
// GET MY PRODUCTS
//////////////////////////////////////

export const getMyProducts = async (userId: string) => {
  const products = await prisma.product.findMany({
    where: { userId },
    orderBy: { productId: "desc" },
    select: {
      productId: true,
      productName: true,
      category: true,
      unit: true,
      productImage: true,
    },
  });

  return products;
};

//////////////////////////////////////
// UPDATE PRODUCT (ONLY OWNER)
//////////////////////////////////////

export const updateProduct = async (
  productId: string,
  userId: string,
  data: UpdateProductDTO,
  imageUrl?: string,
) => {
  const product = await prisma.product.findUnique({
    where: { productId },
  });

  if (!product || product.userId !== userId) {
    throw new ApiError(404, "Product Not Found");
  }

  const updatedProduct = await prisma.product.update({
    where: { productId },
    data: {
      productName: data.productName ?? product.productName,
      category: data.category ?? product.category,
      unit: data.unit ?? product.unit,
      productImage: imageUrl ?? product.productImage,
    },
    select: {
      productId: true,
      productName: true,
      category: true,
      unit: true,
      productImage: true,
    },
  });

  return {
    message: "Product updated successfully",
    product: updatedProduct,
  };
};

//////////////////////////////////////
// DELETE PRODUCT (ONLY OWNER)
//////////////////////////////////////

export const deleteProduct = async (productId: string, userId: string) => {
  const product = await prisma.product.findUnique({
    where: { productId },
  });

  if (!product || product.userId !== userId) {
    throw new Error("Product not found or unauthorized");
  }

  await prisma.product.delete({
    where: { productId },
  });

  return {
    message: "Product deleted successfully",
  };
};

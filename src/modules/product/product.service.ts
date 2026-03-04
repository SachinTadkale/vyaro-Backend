import prisma from "../../config/prisma";

//////////////////////////////////////
// CREATE PRODUCT
//////////////////////////////////////

export const createProduct = async (
  userId: string,
  data: any,
  imageUrl?: string
) => {
  const product = await prisma.product.create({
    data: {
      productName: data.productName,
      category: data.category,
      unit: data.unit,
      productImage: imageUrl,
      userId,
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
  return prisma.product.findMany({
    where: { userId },
    orderBy: { productId: "desc" },
  });
};

//////////////////////////////////////
// UPDATE PRODUCT (ONLY OWNER)
//////////////////////////////////////

export const updateProduct = async (
  productId: string,
  userId: string,
  data: any,
  imageUrl?: string
) => {
  const product = await prisma.product.findFirst({
    where: {
      productId,
      userId,
    },
  });

  if (!product) {
    throw new Error("Product not found or unauthorized");
  }

  return prisma.product.update({
    where: { productId },
    data: {
      productName: data.productName ?? product.productName,
      category: data.category ?? product.category,
      unit: data.unit ?? product.unit,
      productImage: imageUrl ?? product.productImage,
    },
  });
};

//////////////////////////////////////
// DELETE PRODUCT (ONLY OWNER)
//////////////////////////////////////

export const deleteProduct = async (
  productId: string,
  userId: string
) => {
  const product = await prisma.product.findFirst({
    where: {
      productId,
      userId,
    },
  });

  if (!product) {
    throw new Error("Product not found or unauthorized");
  }

  await prisma.product.delete({
    where: { productId },
  });

  return { message: "Product deleted successfully" };
};
import { Prisma, VerificationStatus } from "@prisma/client";
import prisma from "../../config/prisma";
import ApiError from "../../utils/apiError";
import { CreateProductDTO, UpdateProductDTO } from "./product.type";

const productSelection = {
  productId: true,
  productName: true,
  category: true,
  unit: true,
  productImage: true,
  userId: true,
} satisfies Prisma.ProductSelect;

type ProductLookupRow = {
  productId: string;
  productName: string;
  category: string;
  unit: string;
  productImage: string | null;
  userId: string;
};

const normalizeText = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
const cleanText = (value: string) => value.trim().replace(/\s+/g, " ");

const ensureVerifiedProductCreator = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: {
      user_id: true,
      verificationStatus: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.verificationStatus !== VerificationStatus.VERIFIED) {
    throw new ApiError(403, "Only verified users can create products");
  }
};

const buildNormalizedEquals = (columnName: string, value: string) => Prisma.sql`
  lower(regexp_replace(trim(${Prisma.raw(columnName)}), '\\s+', ' ', 'g')) = ${value}
`;

const buildNormalizedContains = (columnName: string, value: string) => Prisma.sql`
  lower(regexp_replace(trim(${Prisma.raw(columnName)}), '\\s+', ' ', 'g')) LIKE ${`%${value}%`}
`;

const findExactProductMatch = async (input: {
  productName: string;
  category?: string;
  unit?: string;
  excludeProductId?: string;
}) => {
  const normalizedName = normalizeText(input.productName);
  const normalizedCategory = input.category ? normalizeText(input.category) : undefined;
  const normalizedUnit = input.unit ? cleanText(input.unit) : undefined;

  const rows = await prisma.$queryRaw<ProductLookupRow[]>(Prisma.sql`
    SELECT
      "productId",
      "productName",
      "category",
      "unit",
      "productImage",
      "userId"
    FROM "Product"
    WHERE ${buildNormalizedEquals('"productName"', normalizedName)}
      ${normalizedCategory
        ? Prisma.sql`AND ${buildNormalizedEquals('"category"', normalizedCategory)}`
        : Prisma.empty}
      ${normalizedUnit
        ? Prisma.sql`AND lower(trim("unit")) = lower(${normalizedUnit})`
        : Prisma.empty}
      ${input.excludeProductId
        ? Prisma.sql`AND "productId" <> ${input.excludeProductId}`
        : Prisma.empty}
    ORDER BY "createdAt" ASC
    LIMIT 1
  `);

  return rows[0] ?? null;
};

const findSimilarProducts = async (input: {
  productName: string;
  category?: string;
}) => {
  const normalizedName = normalizeText(input.productName);
  const normalizedCategory = input.category ? normalizeText(input.category) : undefined;

  return prisma.$queryRaw<
    Array<{
      productId: string;
      productName: string;
      category: string;
      unit: string;
    }>
  >(Prisma.sql`
    SELECT
      "productId",
      "productName",
      "category",
      "unit"
    FROM "Product"
    WHERE ${buildNormalizedContains('"productName"', normalizedName)}
      ${normalizedCategory
        ? Prisma.sql`AND ${buildNormalizedEquals('"category"', normalizedCategory)}`
        : Prisma.empty}
    ORDER BY "productName" ASC
    LIMIT 5
  `);
};

export const resolveProductForListing = async (input: {
  productName: string;
  category?: string;
  unit?: string;
}) => {
  const normalizedName = normalizeText(input.productName);
  const product = await findExactProductMatch(input);

  if (product) {
    return {
      found: true as const,
      normalizedProductName: normalizedName,
      product,
    };
  }

  const similarProducts = await findSimilarProducts(input);

  return {
    found: false as const,
    normalizedProductName: normalizedName,
    similarProducts,
  };
};

//////////////////////////////////////
// CREATE PRODUCT
//////////////////////////////////////

export const createProduct = async (
  userId: string,
  data: CreateProductDTO,
  imageUrl?: string,
) => {
  await ensureVerifiedProductCreator(userId);

  const existingProduct = await findExactProductMatch({
    productName: data.productName,
    category: data.category,
  });

  if (existingProduct) {
    throw new ApiError(409, "Product already exists", {
      code: "PRODUCT_ALREADY_EXISTS",
      details: {
        productId: existingProduct.productId,
        productName: existingProduct.productName,
        category: existingProduct.category,
      },
    });
  }

  const product = await prisma.product.create({
    data: {
      productName: cleanText(data.productName),
      category: cleanText(data.category),
      unit: cleanText(data.unit),
      productImage: imageUrl,
      userId,
    },
    select: productSelection,
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
    orderBy: { createdAt: "desc" },
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

  const nextProductName = data.productName ?? product.productName;
  const nextCategory = data.category ?? product.category;

  const conflictingProduct = await findExactProductMatch({
    productName: nextProductName,
    category: nextCategory,
    excludeProductId: productId,
  });

  if (conflictingProduct) {
    throw new ApiError(409, "Product already exists", {
      code: "PRODUCT_ALREADY_EXISTS",
    });
  }

  const updatedProduct = await prisma.product.update({
    where: { productId },
    data: {
      productName: cleanText(nextProductName),
      category: cleanText(nextCategory),
      unit: data.unit ? cleanText(data.unit) : product.unit,
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
    throw new ApiError(404, "Product not found or unauthorized");
  }

  await prisma.product.delete({
    where: { productId },
  });

  return {
    message: "Product deleted successfully",
  };
};

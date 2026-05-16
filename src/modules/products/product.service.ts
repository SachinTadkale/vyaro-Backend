/**
 * Module: Product.service
 * Purpose: Implements the Product.service module for FarmZy.
 */
import { Prisma, VerificationStatus, ProductUnit, ProductCategory } from "@prisma/client";
import prisma from "../../config/prisma";
import ApiError from "../../utils/apiError";
import { CreateProductDTO, UpdateProductDTO } from "./product.type";
import { translateText } from "../../services/translation/translation.service";
import { TranslationResult } from "../../services/translation/translation.interface";
import { CATEGORY_UNIT_MAPPING, ALL_UNITS, ALL_CATEGORIES } from "./product.constants";

// ─── Field Selection ─────────────────────────────────────────────────────────

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
  category: ProductCategory;
  unit: ProductUnit;
  productImage: string | null;
  userId: string;
};

// ─── Text Normalizers ────────────────────────────────────────────────────────

const normalizeText = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
const cleanText = (value: string) => value.trim().replace(/\s+/g, " ");

// ─── Verified User Guard ─────────────────────────────────────────────────────

const ensureVerifiedProductCreator = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: { user_id: true, verificationStatus: true },
  });

  if (!user) throw new ApiError(404, "User not found");

  if (user.verificationStatus !== VerificationStatus.VERIFIED) {
    throw new ApiError(403, "Only verified users can create products");
  }
};

// ─── SQL Helpers ─────────────────────────────────────────────────────────────

const buildNormalizedEquals = (columnName: string, value: string) => Prisma.sql`
  lower(regexp_replace(trim(${Prisma.raw(columnName)}), '\\s+', ' ', 'g')) = ${value}
`;

const buildNormalizedContains = (columnName: string, value: string) => Prisma.sql`
  lower(regexp_replace(trim(${Prisma.raw(columnName)}), '\\s+', ' ', 'g')) LIKE ${`%${value}%`}
`;

// ─── Product Lookup Helpers ───────────────────────────────────────────────────

const findExactProductMatch = async (input: {
  productName: string;
  category?: ProductCategory;
  unit?: ProductUnit;
  excludeProductId?: string;
}) => {
  const normalizedName = normalizeText(input.productName);

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
      ${input.category
        ? Prisma.sql`AND "category" = ${input.category}::"ProductCategory"`
        : Prisma.empty}
      ${input.unit
        ? Prisma.sql`AND "unit" = ${input.unit}::"ProductUnit"`
        : Prisma.empty}
      ${input.excludeProductId
        ? Prisma.sql`AND "productId" != ${input.excludeProductId}`
        : Prisma.empty}
    LIMIT 1
  `);

  return rows[0] ?? null;
};

const findSimilarProducts = async (input: {
  productName: string;
  category?: ProductCategory;
}) => {
  const normalizedName = normalizeText(input.productName);

  return prisma.$queryRaw<
    Array<{ productId: string; productName: string; category: ProductCategory; unit: ProductUnit }>
  >(Prisma.sql`
    SELECT
      "productId",
      "productName",
      "category",
      "unit"
    FROM "Product"
    WHERE ${buildNormalizedContains('"productName"', normalizedName)}
      ${input.category
        ? Prisma.sql`AND "category" = ${input.category}::"ProductCategory"`
        : Prisma.empty}
    ORDER BY "productName" ASC
    LIMIT 5
  `);
};

// ─── Unit Validation ─────────────────────────────────────────────────────────

const validateUnitForCategory = (category: ProductCategory, unit: ProductUnit) => {
  const allowedUnits = CATEGORY_UNIT_MAPPING[category];
  if (!allowedUnits || !allowedUnits.includes(unit)) {
    throw new ApiError(
      400,
      `Invalid unit "${unit}" for category "${category}". Allowed units: ${allowedUnits.join(", ")}`
    );
  }
};

// ─── Translation Enrichment ───────────────────────────────────────────────────

type EnrichedProduct = ProductLookupRow & {
  translations: {
    name: TranslationResult;
    category: TranslationResult;
  };
};

const enrichProductWithTranslations = async (
  product: ProductLookupRow
): Promise<EnrichedProduct> => {
  const [nameTranslation, categoryTranslation] = await Promise.all([
    translateText(product.productName, "PRODUCT"),
    translateText(product.category, "CATEGORY"),
  ]);

  return {
    ...product,
    translations: {
      name: nameTranslation,
      category: categoryTranslation,
    },
  };
};

const enrichProductsWithTranslations = async (
  products: ProductLookupRow[]
): Promise<EnrichedProduct[]> => {
  return Promise.all(products.map(enrichProductWithTranslations));
};

// ─── RESOLVE PRODUCT FOR LISTING ─────────────────────────────────────────────

export const resolveProductForListing = async (input: {
  productName: string;
  category?: ProductCategory;
  unit?: ProductUnit;
}) => {
  const normalizedName = normalizeText(input.productName);
  const product = await findExactProductMatch(input);

  if (product) {
    const enriched = await enrichProductWithTranslations(product);
    return {
      found: true as const,
      normalizedProductName: normalizedName,
      product: enriched,
    };
  }

  const similarProducts = await findSimilarProducts(input);

  return {
    found: false as const,
    normalizedProductName: normalizedName,
    similarProducts,
  };
};

// ─── CREATE PRODUCT ───────────────────────────────────────────────────────────

export const createProduct = async (
  userId: string,
  data: CreateProductDTO,
  imageUrl?: string,
) => {
  await ensureVerifiedProductCreator(userId);

  validateUnitForCategory(data.category, data.unit);

  const existingProduct = await findExactProductMatch({
    productName: data.productName,
    category: data.category,
    unit: data.unit,
  });

  if (existingProduct) {
    throw new ApiError(409, "Product already exists", {
      code: "PRODUCT_ALREADY_EXISTS",
    });
  }

  const product = await prisma.product.create({
    data: {
      productName: cleanText(data.productName),
      category: data.category,
      unit: data.unit,
      productImage: imageUrl,
      userId,
    },
    select: productSelection,
  });

  Promise.all([
    translateText(product.productName, "PRODUCT"),
    translateText(product.category, "CATEGORY"),
  ]).catch(() => {});

  const enriched = await enrichProductWithTranslations(product as ProductLookupRow);

  return {
    message: "Product created successfully",
    product: enriched,
  };
};

// ─── GET MY PRODUCTS ──────────────────────────────────────────────────────────

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
      userId: true,
      listings: {
        where: { status: "ACTIVE" },
        select: { listingId: true },
        take: 1,
      },
    },
  });

  const productsWithListedStatus = products.map((p) => ({
    ...p,
    isListed: p.listings.length > 0,
    listings: undefined,
  }));

  return enrichProductsWithTranslations(productsWithListedStatus as ProductLookupRow[]);
};

// ─── UPDATE PRODUCT ───────────────────────────────────────────────────────────

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

  const nextCategory = data.category ?? product.category;
  const nextUnit = data.unit ?? product.unit;

  validateUnitForCategory(nextCategory, nextUnit);

  const nextProductName = data.productName ?? product.productName;

  const conflictingProduct = await findExactProductMatch({
    productName: nextProductName,
    category: nextCategory,
    unit: nextUnit,
    excludeProductId: productId,
  });

  if (conflictingProduct) {
    throw new ApiError(409, "Product already exists");
  }

  const updatedProduct = await prisma.product.update({
    where: { productId },
    data: {
      productName: cleanText(nextProductName),
      category: nextCategory,
      unit: nextUnit,
      productImage: imageUrl ?? product.productImage,
    },
    select: productSelection,
  });

  Promise.all([
    translateText(updatedProduct.productName, "PRODUCT"),
    translateText(updatedProduct.category, "CATEGORY"),
  ]).catch(() => {});

  const enriched = await enrichProductWithTranslations(updatedProduct as ProductLookupRow);

  return {
    message: "Product updated successfully",
    product: enriched,
  };
};

// ─── DELETE PRODUCT ───────────────────────────────────────────────────────────

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

  return { message: "Product deleted successfully" };
};

// ─── Metadata Helpers ────────────────────────────────────────────────────────

export const getProductUnits = () => {
  return ALL_UNITS;
};

export const getCategoriesWithUnits = () => {
  return ALL_CATEGORIES.map((cat) => ({
    category: cat,
    allowedUnits: CATEGORY_UNIT_MAPPING[cat],
  }));
};

/**
 * Module: Product.service
 * Purpose: Implements the Product.service module for FarmZy.
 *
 * i18n Integration:
 *  - createProduct: triggers background translation of productName + category
 *    (stored in TranslationDictionary for reuse across all users)
 *  - getMyProducts: enriches each product with its translations (from dictionary/cache)
 *  - resolveProductForListing: translation-enriched results
 *  - updateProduct: re-translates on rename (upsert in dictionary)
 *
 * Rules:
 *  - productId, userId, unit → NEVER translated
 *  - productName, category    → ALWAYS translated (PRODUCT / CATEGORY type)
 *  - Translation failures     → gracefully degraded, product still returned
 */
import { Prisma, VerificationStatus } from "@prisma/client";
import prisma from "../../config/prisma";
import ApiError from "../../utils/apiError";
import { CreateProductDTO, UpdateProductDTO } from "./product.type";
import { translateText } from "../../services/translation/translation.service";
import { TranslationResult } from "../../services/translation/translation.interface";

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
  category: string;
  unit: string;
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
    Array<{ productId: string; productName: string; category: string; unit: string }>
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

// ─── Translation Enrichment ───────────────────────────────────────────────────

type EnrichedProduct = ProductLookupRow & {
  translations: {
    name: TranslationResult;
    category: TranslationResult;
  };
};

/**
 * Enriches a product (or list of products) with dictionary/cache translations.
 * Failures are gracefully degraded — the product is always returned.
 */
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

// ─── Resolve Product For Listing ─────────────────────────────────────────────

/**
 * Resolve Product For Listing.
 */
export const resolveProductForListing = async (input: {
  productName: string;
  category?: string;
  unit?: string;
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

/**
 * Create Product.
 */
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

  // Trigger translations (fire-and-forget — stored in dictionary for future GET calls)
  // This runs AFTER the DB write so it never blocks the create response.
  Promise.all([
    translateText(product.productName, "PRODUCT"),
    translateText(product.category, "CATEGORY"),
  ]).catch(() => {}); // non-critical — dictionary miss is always recovered on GET

  const enriched = await enrichProductWithTranslations(product);

  return {
    message: "Product created successfully",
    product: enriched,
  };
};

// ─── GET MY PRODUCTS ──────────────────────────────────────────────────────────

/**
 * Get My Products.
 * Returns all products enriched with multilingual translations.
 */
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
    },
  });

  // Enrich all products with translations in parallel
  return enrichProductsWithTranslations(products);
};

// ─── UPDATE PRODUCT ───────────────────────────────────────────────────────────

/**
 * Update Product.
 */
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
    select: productSelection,
  });

  // Re-translate on rename (upserts dictionary entry)
  Promise.all([
    translateText(updatedProduct.productName, "PRODUCT"),
    translateText(updatedProduct.category, "CATEGORY"),
  ]).catch(() => {});

  const enriched = await enrichProductWithTranslations(updatedProduct);

  return {
    message: "Product updated successfully",
    product: enriched,
  };
};

// ─── DELETE PRODUCT ───────────────────────────────────────────────────────────

/**
 * Delete Product.
 */
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

import { ProductCategory, ProductUnit } from "@prisma/client";

export const CATEGORY_UNIT_MAPPING: Record<ProductCategory, ProductUnit[]> = {
  [ProductCategory.VEGETABLES]: [
    ProductUnit.KG,
    ProductUnit.QUINTAL,
    ProductUnit.TON,
    ProductUnit.CRATE,
  ],
  [ProductCategory.FRUITS]: [
    ProductUnit.KG,
    ProductUnit.DOZEN,
    ProductUnit.BOX,
    ProductUnit.CRATE,
    ProductUnit.TON,
  ],
  [ProductCategory.GRAINS]: [
    ProductUnit.KG,
    ProductUnit.QUINTAL,
    ProductUnit.TON,
  ],
  [ProductCategory.MILK]: [
    ProductUnit.LITER,
  ],
  [ProductCategory.FLOWERS]: [
    ProductUnit.BUNDLE,
    ProductUnit.KG,
    ProductUnit.PIECE,
  ],
};

export const ALL_UNITS = Object.values(ProductUnit) as ProductUnit[];
export const ALL_CATEGORIES = Object.values(ProductCategory) as ProductCategory[];

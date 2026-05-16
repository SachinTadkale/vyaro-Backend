/**
 * Module: Product.type
 * Purpose: Implements the Product.type module for FarmZy.
 */
import { ProductUnit, ProductCategory } from "@prisma/client";

export interface CreateProductDTO {
  productName: string;
  category: ProductCategory;
  unit: ProductUnit;
}

export interface UpdateProductDTO {
  productName?: string;
  category?: ProductCategory;
  unit?: ProductUnit;
}
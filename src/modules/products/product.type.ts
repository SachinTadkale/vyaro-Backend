/**
 * Module: Product.type
 * Purpose: Implements the Product.type module for FarmZy.
 * Note: Documentation-only change; behavior remains unchanged.
 */
export interface CreateProductDTO {
  productName: string;
  category: string;
  unit: string;
}

export interface UpdateProductDTO {
  productName?: string;
  category?: string;
  unit?: string;
}
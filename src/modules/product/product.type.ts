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
export interface Product {
  id: number;
  name: string;
  sku: string;
  description: string | null;
  price: number | string;
  stock_quantity: number;
  category: string | null;
  brand: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ProductResponse {
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
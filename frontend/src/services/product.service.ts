import type {
  ProductResponse,
} from "../types/product";

const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://localhost:3000";

interface GetProductsParams {
  page: number;
  limit: number;
  search: string;
  status: string;
}

export async function getProducts(
  params: GetProductsParams,
): Promise<ProductResponse> {
  const searchParams =
    new URLSearchParams({
      page: String(params.page),
      limit: String(params.limit),
    });

  if (params.search.trim()) {
    searchParams.set(
      "search",
      params.search.trim(),
    );
  }

  if (params.status) {
    searchParams.set(
      "status",
      params.status,
    );
  }

  const response =
    await fetch(
      `${API_URL}/products?${searchParams.toString()}`,
    );

  if (!response.ok) {
    throw new Error(
      "Failed to load products.",
    );
  }

  return response.json();
}
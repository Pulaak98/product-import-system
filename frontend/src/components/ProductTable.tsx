import type { Product } from "../types/product";

interface ProductTableProps {
  products: Product[];
}

function ProductTable({
  products,
}: ProductTableProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-14 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500">
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20 13V6a2 2 0 0 0-2-2h-3.5L13 2H11L9.5 4H6a2 2 0 0 0-2 2v7"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 17h16M7 21h10"
            />
          </svg>
        </div>

        <h3 className="mt-5 text-base font-semibold text-neutral-900">
          No products found
        </h3>

        <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">
          Import a CSV file to populate your product
          catalog.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
        <div>
          <h2 className="font-semibold text-neutral-900">
            Products
          </h2>

          <p className="mt-0.5 text-sm text-neutral-500">
            {products.length} product
            {products.length === 1 ? "" : "s"} in catalog
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-neutral-50">
            <tr className="border-b border-neutral-200">
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Product
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                SKU
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Price
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Stock
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Category
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Status
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Created
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-neutral-100">
            {products.map((product) => (
              <tr
                key={product.id}
                className="transition hover:bg-neutral-50"
              >
                <td className="px-6 py-4">
                  <div className="font-medium text-neutral-900">
                    {product.name}
                  </div>

                  {product.brand && (
                    <div className="mt-0.5 text-sm text-neutral-500">
                      {product.brand}
                    </div>
                  )}
                </td>

                <td className="px-6 py-4">
                  <span className="rounded-lg bg-neutral-100 px-2.5 py-1 font-mono text-xs text-neutral-700">
                    {product.sku}
                  </span>
                </td>

                <td className="px-6 py-4 text-sm font-medium text-neutral-900">
                  ${Number(product.price).toFixed(2)}
                </td>

                <td className="px-6 py-4 text-sm text-neutral-600">
                  {product.stock_quantity}
                </td>

                <td className="px-6 py-4 text-sm text-neutral-600">
                  {product.category ?? "-"}
                </td>

                <td className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                      product.status === "active"
                        ? "bg-green-100 text-green-700"
                        : product.status === "inactive"
                          ? "bg-neutral-100 text-neutral-600"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {product.status}
                  </span>
                </td>

                <td className="px-6 py-4 text-sm text-neutral-500">
                  {new Date(
                    product.created_at,
                  ).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ProductTable;
import type { Product } from '../types/product';

interface ProductTableProps {
  products: Product[];
}

function ProductTable({ products }: ProductTableProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center">
        <p className="text-neutral-500">No products found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-neutral-200 bg-neutral-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-700">
                Product
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-700">
                SKU
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-700">
                Price
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-700">
                Stock
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-700">
                Category
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-700">
                Status
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-700">
                Created
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-neutral-100">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-neutral-50">
                <td className="px-6 py-4">
                  <div className="font-medium text-neutral-900">
                    {product.name}
                  </div>

                  {product.brand && (
                    <div className="text-sm text-neutral-500">
                      {product.brand}
                    </div>
                  )}
                </td>

                <td className="px-6 py-4 text-sm text-neutral-600">
                  {product.sku}
                </td>

                <td className="px-6 py-4 text-sm text-neutral-900">
                  ${Number(product.price).toFixed(2)}
                </td>

                <td className="px-6 py-4 text-sm text-neutral-600">
                  {product.stock_quantity}
                </td>

                <td className="px-6 py-4 text-sm text-neutral-600">
                  {product.category ?? '-'}
                </td>

                <td className="px-6 py-4">
                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium capitalize text-neutral-700">
                    {product.status}
                  </span>
                </td>

                <td className="px-6 py-4 text-sm text-neutral-500">
                  {new Date(product.created_at).toLocaleDateString()}
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
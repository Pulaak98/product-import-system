import { useEffect, useState } from 'react';
import ProductTable from './components/ProductTable';
import { getProducts } from './services/product.service';
import type { Product } from './types/product';

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadProducts() {
    try {
      setLoading(true);
      setError('');

      const response = await getProducts({
        page,
        limit,
        search,
        status,
      });

      setProducts(response.data);
      setTotal(response.pagination.total);
      setTotalPages(response.pagination.totalPages);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load products.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, [page, status]);

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    loadProducts();
  }

  function handleStatusChange(
    event: React.ChangeEvent<HTMLSelectElement>,
  ) {
    setStatus(event.target.value);
    setPage(1);
  }

  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-neutral-900">
              Products
            </h1>

            <p className="mt-1 text-neutral-500">
              Manage products imported into your system.
            </p>
          </div>

          <button
            type="button"
            className="rounded-lg bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Import Products
          </button>
        </div>

        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4">
          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-3 md:flex-row"
          >
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products..."
              className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-500"
            />

            <select
              value={status}
              onChange={handleStatusChange}
              className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-500"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="draft">Draft</option>
            </select>

            <button
              type="submit"
              className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Search
            </button>
          </form>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center text-neutral-500">
            Loading products...
          </div>
        ) : (
          <>
            <ProductTable products={products} />

            <div className="mt-5 flex flex-col gap-3 text-sm text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
              <p>
                {total === 0
                  ? 'No products'
                  : `Showing ${products.length} of ${total} products`}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                  className="rounded-lg border border-neutral-300 bg-white px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="px-2">
                  Page {totalPages === 0 ? 0 : page} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-lg border border-neutral-300 bg-white px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default App;
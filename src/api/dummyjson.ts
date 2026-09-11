const BASE_URL = 'https://dummyjson.com';

// ── URL builder ──────────────────────────────────────────────────
// Builds a clean URL and appends any query params (skipping empty ones).
// TIP: You can append `delay=2000` to any URL to simulate a slow network
// and manually test that our race-condition handling works correctly.
const buildUrl = (path: string, params?: Record<string, string | number | undefined>) => {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });
  }
  // ↓ Uncomment to simulate a slow network and test race condition handling
  // url.searchParams.append('delay', '2000');
  return url.toString();
};

// ── Product list ─────────────────────────────────────────────────
// `signal` comes from React Query and is used to cancel stale requests
// when the user types a new search term before the old one resolves.
export const fetchProducts = async (
  {
    limit = 10,
    skip = 0,
    sortBy,
    order,
    category,
    q,
  }: {
    limit?: number;
    skip?: number;
    sortBy?: string;
    order?: string;
    category?: string;
    q?: string;
  },
  signal?: AbortSignal,
) => {
  // DummyJSON uses different endpoints for search vs category browsing
  let endpoint = '/products';
  if (q) {
    endpoint = '/products/search';
  } else if (category) {
    endpoint = `/products/category/${category}`;
  }

  const url = buildUrl(endpoint, { limit, skip, sortBy, order, q });
  const res = await fetch(url, { signal });

  if (!res.ok) throw new Error('Failed to load products. Please check your connection.');
  return res.json();
};

// ── Single product ───────────────────────────────────────────────
export const fetchProductById = async (id: string, signal?: AbortSignal) => {
  const url = buildUrl(`/products/${id}`);
  const res = await fetch(url, { signal });

  if (!res.ok) {
    if (res.status === 404) throw new Error('This item could not be found.');
    throw new Error('Failed to load item details.');
  }
  return res.json();
};

// ── Stock update ─────────────────────────────────────────────────
// DummyJSON mock: the PUT succeeds but doesn't persist between sessions.
// In a real app, this would call a real backend endpoint.
export const updateProductStock = async (id: string, newStock: number) => {
  const res = await fetch(`${BASE_URL}/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stock: newStock }),
  });

  if (!res.ok) throw new Error('Failed to update stock.');
  return res.json();
};

// ── Category list ─────────────────────────────────────────────────
export const fetchCategories = async (signal?: AbortSignal) => {
  const res = await fetch(`${BASE_URL}/products/categories`, { signal });
  if (!res.ok) throw new Error('Failed to load categories.');
  return res.json();
};

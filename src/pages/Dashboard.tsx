/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchProducts, fetchCategories } from '../api/dummyjson';
import { Search, ChevronLeft, ChevronRight, AlertCircle, RefreshCw, PackageX } from 'lucide-react';
import './Dashboard.css';

// Debounce hook — delays updating the value until the user stops typing
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// Determine badge color based on stock level
function stockBadgeClass(stock: number) {
  if (stock === 0) return 'badge badge-red';
  if (stock < 10) return 'badge badge-amber';
  return 'badge badge-green';
}

// Product shape from DummyJSON
interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  thumbnail: string;
}

export const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read current state from URL
  const page = parseInt(searchParams.get('page') || '1', 10);
  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || '';

  // Helper: update one or more URL params without losing the rest.
  // Defined early so the useEffects below can safely reference it.
  const updateParams = (next: Record<string, string>) => {
    const p = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    setSearchParams(p);
  };

  // Search box has its own local state so typing feels instant.
  // The URL only updates after the user pauses (debounce below).
  const [searchTerm, setSearchTerm] = useState(q);
  const debouncedSearch = useDebounce(searchTerm, 400);

  // When the debounced value settles, push it to the URL
  useEffect(() => {
    if (debouncedSearch !== q) {
      updateParams({ q: debouncedSearch, page: '1' });
    }
  }, [debouncedSearch]);

  // Keep the search input in sync with the URL when the user hits the
  // browser back button. We initialise from the URL on first render too.
  // Note: we intentionally use q directly as the initial value of searchTerm
  // instead of an effect to avoid the setState-in-effect lint warning.
  // The effect below only runs on back-navigation (when q changes externally).
  useEffect(() => {
    setSearchTerm(q);
  }, [q]);

  const limit = 10;
  const skip = (page - 1) * limit;

  // Parse "price-asc" into { sortBy: "price", order: "asc" }
  const [sortBy, order] = sort ? sort.split('-') : [];

  // Fetch category list — only runs once, cached for 5 minutes
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: ({ signal }) => fetchCategories(signal),
    staleTime: 1000 * 60 * 5,
  });

  // Fetch products.
  // The `signal` passed by React Query automatically cancels the HTTP request
  // if the user types again before the previous request finishes (race condition fix).
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['products', { limit, skip, sortBy, order, category, q }],
    queryFn: ({ signal }) => fetchProducts({ limit, skip, sortBy, order, category, q }, signal),
    // Keep showing the old results while new ones load, instead of a blank flash
    placeholderData: (prev) => prev,
  });

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateParams({ category: e.target.value, page: '1', q: '' });
    setSearchTerm('');
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateParams({ sort: e.target.value, page: '1' });
  };

  const clearAll = () => {
    setSearchTerm('');
    updateParams({ q: '', category: '', sort: '', page: '1' });
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 0;
  const hasActiveFilters = q || category || sort;

  return (
    <div className="container dashboard">
      {/* ── Toolbar ── */}
      <div className="toolbar">
        {/* Search */}
        <div className="search-wrap">
          <Search className="search-icon" size={16} aria-hidden="true" />
          <input
            type="search"
            className="input search-input"
            placeholder="Search items…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={!!category}
            title={category ? 'Clear the category filter to search' : undefined}
            aria-label="Search stock items"
          />
        </div>

        {/* Category filter */}
        <select
          className="input toolbar__select"
          value={category}
          onChange={handleCategoryChange}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categories?.map((c: { slug: string; name: string }) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          className="input toolbar__select"
          value={sort}
          onChange={handleSortChange}
          aria-label="Sort items"
        >
          <option value="">Sort by</option>
          <option value="title-asc">Name A → Z</option>
          <option value="title-desc">Name Z → A</option>
          <option value="price-asc">Price: low first</option>
          <option value="price-desc">Price: high first</option>
          <option value="stock-asc">Stock: low first</option>
          <option value="stock-desc">Stock: high first</option>
        </select>

        {/* Clear all button — only shows when filters are active */}
        {hasActiveFilters && (
          <button className="btn btn-ghost" onClick={clearAll}>
            Clear
          </button>
        )}
      </div>

      {/* ── Content area ── */}

      {/* Error state */}
      {isError && (
        <div className="card error-panel fade-in">
          <AlertCircle size={36} />
          <h2>Couldn't load stock</h2>
          <p>{(error as Error).message}</p>
          <button className="btn btn-primary" onClick={() => refetch()}>
            <RefreshCw size={14} /> Try again
          </button>
        </div>
      )}

      {/* Initial loading state */}
      {!isError && isLoading && !data && (
        <div className="page-loader">
          <span className="spinner" aria-label="Loading…" />
        </div>
      )}

      {/* Empty state */}
      {!isError && !isLoading && data?.products?.length === 0 && (
        <div className="empty-state fade-in">
          <PackageX size={48} />
          <p>No items found{q ? ` for "${q}"` : ''}.</p>
          {hasActiveFilters && (
            <button className="btn btn-ghost" onClick={clearAll}>
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {data && data.products.length > 0 && (
        <>
          {/* Meta row */}
          <div className="results-meta">
            <span className="text-muted">
              {data.skip + 1}–{Math.min(data.skip + limit, data.total)} of {data.total} items
            </span>
            {isFetching && (
              <span className="updating-indicator">
                <span
                  className="spinner"
                  style={{ width: '0.85rem', height: '0.85rem' }}
                  aria-hidden="true"
                />
                Updating…
              </span>
            )}
          </div>

          {/* Grid */}
          <div className="stock-grid">
            {data.products.map((p: Product) => (
              <button
                key={p.id}
                className="stock-card card"
                onClick={() => navigate(`/items/${p.id}`)}
                aria-label={`View ${p.title}`}
              >
                {/* Thumbnail */}
                <div className="stock-card__img">
                  {p.thumbnail ? (
                    <img src={p.thumbnail} alt={p.title} loading="lazy" />
                  ) : (
                    <span className="stock-card__no-img">No image</span>
                  )}
                </div>

                {/* Body */}
                <div className="stock-card__body">
                  <p className="stock-card__category text-muted">{p.category}</p>
                  <h3 className="stock-card__name">{p.title}</h3>
                  <p className="stock-card__desc">{p.description}</p>

                  {/* Footer row */}
                  <div className="stock-card__footer">
                    <span className="stock-card__price">${p.price}</span>
                    <span className={stockBadgeClass(p.stock)}>
                      {p.stock === 0 ? 'Out of stock' : `${p.stock} in stock`}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-ghost"
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
                aria-label="Previous page"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="pagination__info">
                Page {page} of {totalPages}
              </span>
              <button
                className="btn btn-ghost"
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: String(page + 1) })}
                aria-label="Next page"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

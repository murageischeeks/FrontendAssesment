/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProductById, updateProductStock } from '../api/dummyjson';
import { ArrowLeft, AlertCircle, Save, CheckCircle2, RefreshCw } from 'lucide-react';
import './ItemDetail.css';

export const ItemDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [stockInput, setStockInput] = useState('');
  const [saved, setSaved] = useState(false);

  const {
    data: product,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['product', id],
    queryFn: ({ signal }) => fetchProductById(id!, signal),
    enabled: !!id,
  });

  // Pre-fill the stock input once the product data loads from the API.
  // We use useEffect here because we need to wait for the async data —
  // this is one of the valid cases for setting state inside an effect.
  useEffect(() => {
    if (product) setStockInput(String(product.stock));
  }, [product]);

  const updateMutation = useMutation({
    mutationFn: (newStock: number) => updateProductStock(id!, newStock),
    onSuccess: (updated) => {
      // Update the cache so the data is consistent without a full re-fetch
      queryClient.setQueryData(['product', id], updated);
      setSaved(true);
      // Clear the success message after 3 seconds
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newStock = parseInt(stockInput, 10);
    if (isNaN(newStock) || newStock < 0) return;
    setSaved(false);
    updateMutation.mutate(newStock);
  };

  const stockChanged = product && parseInt(stockInput, 10) !== product.stock;

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="page-loader">
        <span className="spinner" aria-label="Loading item…" />
      </div>
    );
  }

  // ── Error state ──
  if (isError || !product) {
    return (
      <div className="container">
        <button className="btn btn-ghost detail-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={15} /> Back
        </button>
        <div className="card error-panel fade-in">
          <AlertCircle size={36} />
          <h2>Item not found</h2>
          <p>
            {(error as Error)?.message || "We couldn't load this item. It may have been removed."}
          </p>
          <button className="btn btn-primary" onClick={() => refetch()}>
            <RefreshCw size={14} /> Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container fade-in">
      <button className="btn btn-ghost detail-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={15} /> Back to stock list
      </button>

      <div className="detail-layout card">
        {/* ── Left: Product image ── */}
        <div className="detail-image-wrap">
          {product.thumbnail ? (
            <img src={product.thumbnail} alt={product.title} className="detail-image" />
          ) : (
            <div className="detail-image-placeholder">No image available</div>
          )}
        </div>

        {/* ── Right: Info + stock form ── */}
        <div className="detail-info">
          <div className="detail-meta">
            <span className="detail-category">{product.category}</span>
            <h2 className="detail-title">{product.title}</h2>
            <p className="detail-price">${product.price}</p>
          </div>

          <p className="detail-description text-muted">{product.description}</p>

          <div className="detail-specs">
            <span>
              <strong>Brand:</strong> {product.brand || 'N/A'}
            </span>
            <span>
              <strong>SKU:</strong> {product.sku}
            </span>
          </div>

          {/* ── Stock correction form ── */}
          <div className="stock-box">
            <h3 className="stock-box__title">Stock Correction</h3>
            <p className="stock-box__hint text-muted">
              Adjust the count below to match the physical shelf count.
            </p>

            <form className="stock-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="stock">
                  Current count
                </label>
                <input
                  id="stock"
                  type="number"
                  min="0"
                  className="input"
                  value={stockInput}
                  onChange={(e) => setStockInput(e.target.value)}
                  disabled={updateMutation.isPending}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary stock-form__btn"
                disabled={updateMutation.isPending || !stockChanged}
              >
                {updateMutation.isPending ? (
                  <>
                    <span className="spinner spinner-sm" aria-hidden="true" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save size={14} /> Update stock
                  </>
                )}
              </button>
            </form>

            {/* Success / Error feedback */}
            {saved && (
              <div className="alert alert-success fade-in" role="status">
                <CheckCircle2 size={16} aria-hidden="true" />
                Stock updated successfully.
              </div>
            )}
            {updateMutation.isError && (
              <div className="alert alert-error fade-in" role="alert">
                <AlertCircle size={16} aria-hidden="true" />
                Update failed — please try again.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

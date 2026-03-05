'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { listCatalogItems, createCatalogItem, updateCatalogItem, deleteCatalogItem } from '@/lib/api';
import { CatalogItem } from '@/types';

// Demo supplier ID – in a real app this comes from the auth session
const DEMO_SUPPLIER_ID = 'a1000000-0000-0000-0000-000000000005';

const EMPTY_FORM = {
  product_name: '',
  category: '',
  description: '',
  unit: 'units',
  moq: '',
  price: '',
};

export default function CatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listCatalogItems({ supplier_id: DEMO_SUPPLIER_ID });
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleEdit = (item: CatalogItem) => {
    setEditingId(item.id);
    setForm({
      product_name: item.product_name,
      category: item.category ?? '',
      description: item.description ?? '',
      unit: item.unit,
      moq: String(item.moq),
      price: item.price != null ? String(item.price) : '',
    });
    setShowForm(true);
    setError('');
  };

  const handleReset = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        supplier_id: DEMO_SUPPLIER_ID,
        product_name: form.product_name,
        category: form.category || undefined,
        description: form.description || undefined,
        unit: form.unit || 'units',
        moq: parseInt(form.moq, 10),
        price: form.price ? parseFloat(form.price) : undefined,
      };

      if (editingId) {
        await updateCatalogItem(editingId, payload);
        setSuccessMsg('Catalog item updated.');
      } else {
        await createCatalogItem(payload);
        setSuccessMsg('Catalog item added.');
      }

      handleReset();
      await loadItems();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save catalog item.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await deleteCatalogItem(id);
      await loadItems();
      setSuccessMsg('Item deactivated.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError('Failed to deactivate item.');
    }
  };

  return (
    <main className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Product Catalog</h1>
          <p className="page-subtitle">Manage your product listings and MOQ rules.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/supplier/dashboard" className="btn-secondary">← Dashboard</Link>
          {!showForm && (
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              + Add Product
            </button>
          )}
        </div>
      </div>

      {successMsg && <div className="alert alert-success">{successMsg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="form-card" style={{ maxWidth: '100%', marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>{editingId ? 'Edit Product' : 'Add Product'}</h2>
          <form className="rfq-form" onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="field">
                <label>Product Name *</label>
                <input
                  value={form.product_name}
                  onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                  placeholder="e.g. Basmati Rice"
                  required
                />
              </div>
              <div className="field">
                <label>Category</label>
                <input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. Grains"
                />
              </div>
              <div className="field">
                <label>Unit</label>
                <input
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder="kg / pcs / litre"
                />
              </div>
              <div className="field">
                <label>MOQ (Minimum Order Quantity) *</label>
                <input
                  type="number"
                  min="1"
                  value={form.moq}
                  onChange={(e) => setForm({ ...form, moq: e.target.value })}
                  placeholder="e.g. 500"
                  required
                />
              </div>
              <div className="field">
                <label>Price per Unit (PKR)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="e.g. 85.00"
                />
              </div>
            </div>
            <div className="field">
              <label>Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Product details, specifications…"
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Saving…' : editingId ? 'Update' : 'Add Product'}
              </button>
              <button type="button" className="btn-secondary" onClick={handleReset}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading catalog…</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <p>Your catalog is empty. Add your first product to get started.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="members-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Unit</th>
                <th>MOQ</th>
                <th>Price (PKR)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.product_name}</strong>
                    {item.description && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td>{item.category ?? '—'}</td>
                  <td>{item.unit}</td>
                  <td>{item.moq.toLocaleString()}</td>
                  <td>{item.price != null ? `PKR ${Number(item.price).toLocaleString()}` : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                        onClick={() => handleEdit(item)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-remove"
                        onClick={() => handleDeactivate(item.id)}
                        title="Deactivate"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

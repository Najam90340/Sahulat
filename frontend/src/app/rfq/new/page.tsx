'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createRfq, CreateRfqPayload } from '@/lib/api';

// Demo buyer — in production this would come from an auth context
const DEMO_BUYER_ID = 'a1000000-0000-0000-0000-000000000001';

export default function NewRfqPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<Omit<CreateRfqPayload, 'buyer_id'>>({
    product_name: '',
    quantity: 1,
    city: '',
    description: '',
    images: [],
  });

  const [imageInput, setImageInput] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === 'quantity' ? Number(value) : value }));
  };

  const addImage = () => {
    const url = imageInput.trim();
    if (url) {
      setForm((prev) => ({ ...prev, images: [...(prev.images ?? []), url] }));
      setImageInput('');
    }
  };

  const removeImage = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      images: (prev.images ?? []).filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const rfq = await createRfq({ ...form, buyer_id: DEMO_BUYER_ID });
      router.push(`/rfq/${rfq.id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to post RFQ. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-container">
      <div className="form-card">
        <h1 className="page-title">Post a Request for Quote (RFQ)</h1>
        <p className="page-subtitle">
          If your quantity is below the supplier&apos;s Minimum Order Quantity (MOQ), a buying pool
          will be created automatically so other buyers can join.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="rfq-form">
          {/* Product name */}
          <div className="field">
            <label htmlFor="product_name">Product Name *</label>
            <input
              id="product_name"
              name="product_name"
              type="text"
              required
              placeholder="e.g. Basmati Rice"
              value={form.product_name}
              onChange={handleChange}
            />
          </div>

          {/* Quantity */}
          <div className="field">
            <label htmlFor="quantity">Quantity (units) *</label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              required
              min={1}
              value={form.quantity}
              onChange={handleChange}
            />
          </div>

          {/* City */}
          <div className="field">
            <label htmlFor="city">City / Delivery Location *</label>
            <input
              id="city"
              name="city"
              type="text"
              required
              placeholder="e.g. Lahore"
              value={form.city}
              onChange={handleChange}
            />
          </div>

          {/* Description */}
          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Any additional specifications or notes…"
              value={form.description}
              onChange={handleChange}
            />
          </div>

          {/* Images */}
          <div className="field">
            <label>Product Images (URLs)</label>
            <div className="image-input-row">
              <input
                type="url"
                placeholder="https://example.com/image.jpg"
                value={imageInput}
                onChange={(e) => setImageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addImage();
                  }
                }}
              />
              <button type="button" className="btn-secondary" onClick={addImage}>
                Add
              </button>
            </div>
            {(form.images ?? []).length > 0 && (
              <ul className="image-list">
                {(form.images ?? []).map((url, idx) => (
                  <li key={idx}>
                    <span className="image-url">{url}</span>
                    <button
                      type="button"
                      className="btn-remove"
                      onClick={() => removeImage(idx)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Submitting…' : 'Post RFQ'}
          </button>
        </form>
      </div>
    </main>
  );
}

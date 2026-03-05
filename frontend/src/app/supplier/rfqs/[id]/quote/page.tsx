'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { submitQuote } from '@/lib/api';

// Demo supplier ID – in a real app this comes from the auth session
const DEMO_SUPPLIER_ID = 'a1000000-0000-0000-0000-000000000005';

export default function QuoteFormPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: rfqId } = use(params);

  const [pricePerUnit, setPricePerUnit] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await submitQuote(rfqId, {
        supplier_id: DEMO_SUPPLIER_ID,
        price_per_unit: parseFloat(pricePerUnit),
        lead_time_days: parseInt(leadTimeDays, 10),
        notes: notes.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => router.push('/supplier/rfqs'), 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit quote. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <main className="page-container">
        <div className="alert alert-success" style={{ maxWidth: 600, margin: '4rem auto', textAlign: 'center' }}>
          ✅ Quote submitted successfully! Redirecting…
        </div>
      </main>
    );
  }

  return (
    <main className="page-container">
      <Link href="/supplier/rfqs" className="back-link">
        ← Back to RFQs
      </Link>

      <div className="form-card">
        <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>Submit Quote</h1>
        <p className="page-subtitle">RFQ ID: {rfqId}</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form className="rfq-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="price_per_unit">Price per Unit (PKR) *</label>
            <input
              id="price_per_unit"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="e.g. 85.00"
              value={pricePerUnit}
              onChange={(e) => setPricePerUnit(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="lead_time_days">Lead Time (days) *</label>
            <input
              id="lead_time_days"
              type="number"
              min="1"
              placeholder="e.g. 7"
              value={leadTimeDays}
              onChange={(e) => setLeadTimeDays(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="notes">Notes (optional)</label>
            <textarea
              id="notes"
              rows={4}
              placeholder="Delivery terms, packaging details, minimum order specifics…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Quote'}
          </button>
        </form>
      </div>
    </main>
  );
}

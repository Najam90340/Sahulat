'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Shipment, ShipmentStatus } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const DEFAULT_SUPPLIER_ID = 'a1000000-0000-0000-0000-000000000005';

const COURIER_OPTIONS = [
  { value: 'tcs',      label: 'TCS' },
  { value: 'leopards', label: 'Leopards Courier' },
  { value: 'postex',   label: 'PostEx' },
  { value: 'mp',       label: 'M&P Courier' },
  { value: 'rider',    label: 'Rider' },
  { value: 'dhl',      label: 'DHL Pakistan' },
  { value: 'other',    label: 'Other' },
];

const STATUS_META: Record<string, { icon: string; label: string; css: string }> = {
  pending:          { icon: '📋', label: 'Pending',           css: 'badge-pending' },
  booked:           { icon: '📦', label: 'Booked',            css: 'badge-orange' },
  picked_up:        { icon: '🚚', label: 'Picked Up',         css: 'badge-orange' },
  in_transit:       { icon: '🛣️', label: 'In Transit',        css: 'badge-orange' },
  out_for_delivery: { icon: '🏃', label: 'Out for Delivery',  css: 'badge-orange' },
  delivered:        { icon: '✅', label: 'Delivered',          css: 'badge-green' },
  failed:           { icon: '❌', label: 'Failed',             css: 'badge-grey' },
};

const NEXT_STATUSES: Record<ShipmentStatus, ShipmentStatus | null> = {
  pending:          'booked',
  booked:           'picked_up',
  picked_up:        'in_transit',
  in_transit:       'out_for_delivery',
  out_for_delivery: 'delivered',
  delivered:        null,
  failed:           null,
};

interface BookFormState {
  pool_id: string;
  courier: string;
  tracking_number: string;
  destination_city: string;
  pickup_address: string;
  estimated_delivery: string;
  notes: string;
}

export default function SupplierShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<BookFormState>({
    pool_id: 'd1000000-0000-0000-0000-000000000002',
    courier: 'tcs',
    tracking_number: '',
    destination_city: 'Karachi',
    pickup_address: '',
    estimated_delivery: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadShipments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/shipments/supplier/${DEFAULT_SUPPLIER_ID}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to load shipments');
      const json = await res.json();
      setShipments(json.data ?? []);
    } catch {
      setError('Failed to load shipments. Ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShipments();
  }, [loadShipments]);

  const handleAdvanceStatus = async (shipment: Shipment) => {
    const next = NEXT_STATUSES[shipment.status];
    if (!next) return;
    setActionLoading(shipment.id);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/shipments/${shipment.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || 'Update failed');
      }
      setSuccess(`Status updated to "${next}".`);
      await loadShipments();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/shipments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pool_id: form.pool_id,
          supplier_id: DEFAULT_SUPPLIER_ID,
          courier: form.courier,
          tracking_number: form.tracking_number || undefined,
          origin_city: 'Lahore',
          destination_city: form.destination_city,
          pickup_address: form.pickup_address || undefined,
          estimated_delivery: form.estimated_delivery || undefined,
          notes: form.notes || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || 'Booking failed');
      }
      setSuccess('Shipment booked successfully!');
      setShowForm(false);
      await loadShipments();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Booking failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Shipments</h1>
          <p className="page-subtitle">Manage courier bookings and track deliveries.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ Book Shipment'}
        </button>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-value">{shipments.length}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {shipments.filter((s) => ['in_transit', 'out_for_delivery', 'picked_up', 'booked'].includes(s.status)).length}
          </div>
          <div className="stat-label">🛣️ Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{shipments.filter((s) => s.status === 'delivered').length}</div>
          <div className="stat-label">✅ Delivered</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{shipments.filter((s) => s.status === 'pending').length}</div>
          <div className="stat-label">📋 Pending</div>
        </div>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="form-card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>Book New Shipment</h2>
          <form className="rfq-form" onSubmit={handleBook}>
            <div className="field">
              <label htmlFor="s-pool">Pool ID *</label>
              <input
                id="s-pool"
                value={form.pool_id}
                onChange={(e) => setForm({ ...form, pool_id: e.target.value })}
                required
                placeholder="Pool UUID"
              />
            </div>
            <div className="field">
              <label htmlFor="s-courier">Courier *</label>
              <select
                id="s-courier"
                value={form.courier}
                onChange={(e) => setForm({ ...form, courier: e.target.value })}
              >
                {COURIER_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="s-tracking">Tracking Number</label>
              <input
                id="s-tracking"
                value={form.tracking_number}
                onChange={(e) => setForm({ ...form, tracking_number: e.target.value })}
                placeholder="e.g. TCS-2024-001234"
              />
            </div>
            <div className="field">
              <label htmlFor="s-dest">Destination City *</label>
              <input
                id="s-dest"
                value={form.destination_city}
                onChange={(e) => setForm({ ...form, destination_city: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="s-pickup">Pickup Address</label>
              <input
                id="s-pickup"
                value={form.pickup_address}
                onChange={(e) => setForm({ ...form, pickup_address: e.target.value })}
                placeholder="Warehouse address"
              />
            </div>
            <div className="field">
              <label htmlFor="s-eta">Estimated Delivery Date</label>
              <input
                id="s-eta"
                type="date"
                value={form.estimated_delivery}
                onChange={(e) => setForm({ ...form, estimated_delivery: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="s-notes">Notes</label>
              <textarea
                id="s-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Special handling instructions…"
              />
            </div>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Booking…' : 'Book Shipment'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading shipments…</div>
      ) : shipments.length === 0 ? (
        <div className="empty-state">
          No shipments yet. Book your first shipment for a confirmed pool.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="members-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Route</th>
                <th>Courier</th>
                <th>Tracking #</th>
                <th>Buyers</th>
                <th>Est. Delivery</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => {
                const meta = STATUS_META[s.status] ?? STATUS_META.pending;
                const next = NEXT_STATUSES[s.status as ShipmentStatus];
                const isUpdating = actionLoading === s.id;
                return (
                  <tr key={s.id}>
                    <td><strong>{s.product_name ?? '—'}</strong></td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {s.origin_city} → {s.destination_city}
                    </td>
                    <td style={{ textTransform: 'uppercase', fontSize: '0.85rem' }}>{s.courier}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {s.tracking_number ?? '—'}
                    </td>
                    <td>{s.member_count ?? 0}</td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {s.estimated_delivery
                        ? new Date(s.estimated_delivery).toLocaleDateString()
                        : '—'}
                    </td>
                    <td>
                      <span className={`badge ${meta.css}`}>
                        {meta.icon} {meta.label}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <Link
                          href={`/tracking/${s.id}`}
                          className="btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                        >
                          Track
                        </Link>
                        {next && (
                          <button
                            className="btn-primary btn-sm"
                            disabled={isUpdating}
                            onClick={() => handleAdvanceStatus(s)}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                          >
                            {isUpdating ? '…' : `→ ${STATUS_META[next]?.icon} ${STATUS_META[next]?.label}`}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

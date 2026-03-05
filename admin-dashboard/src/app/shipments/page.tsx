'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

type ShipmentStatus =
  | 'pending'
  | 'booked'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed';

interface Shipment {
  id: string;
  pool_id: string;
  product_name?: string;
  supplier_name?: string;
  courier: string;
  tracking_number?: string;
  status: ShipmentStatus;
  origin_city: string;
  destination_city: string;
  estimated_delivery?: string;
  member_count?: number;
  created_at: string;
  updated_at: string;
}

const STATUS_META: Record<string, { icon: string; label: string; css: string }> = {
  pending:          { icon: '📋', label: 'Pending',           css: 'badge-pending' },
  booked:           { icon: '📦', label: 'Booked',            css: 'badge-orange' },
  picked_up:        { icon: '🚚', label: 'Picked Up',         css: 'badge-orange' },
  in_transit:       { icon: '🛣️', label: 'In Transit',        css: 'badge-orange' },
  out_for_delivery: { icon: '🏃', label: 'Out for Delivery',  css: 'badge-orange' },
  delivered:        { icon: '✅', label: 'Delivered',          css: 'badge-green' },
  failed:           { icon: '❌', label: 'Failed',             css: 'badge-grey' },
};

const COURIER_LABEL: Record<string, string> = {
  tcs: 'TCS', leopards: 'Leopards', postex: 'PostEx',
  mp: 'M&P', rider: 'Rider', dhl: 'DHL', other: 'Other',
};

export default function AdminShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const loadShipments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = filterStatus ? `?status=${filterStatus}` : '';
      const res = await fetch(`${BASE_URL}/shipments${params}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setShipments(json.data ?? []);
    } catch {
      setError('Failed to load shipments. Ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    loadShipments();
  }, [loadShipments]);

  const total = shipments.length;
  const active = shipments.filter((s) =>
    ['booked', 'picked_up', 'in_transit', 'out_for_delivery'].includes(s.status),
  ).length;
  const delivered = shipments.filter((s) => s.status === 'delivered').length;
  const pending = shipments.filter((s) => s.status === 'pending').length;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <h1 className="page-title">Shipment Tracking</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '0.4rem 0.65rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              fontSize: '0.85rem',
              background: 'white',
            }}
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_META).map(([v, m]) => (
              <option key={v} value={v}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="page-subtitle">Monitor all shipments across the platform.</p>

      {/* Summary stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{total}</div>
          <div className="stat-label">Total Shipments</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{active}</div>
          <div className="stat-label">🛣️ In Transit</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{delivered}</div>
          <div className="stat-label">✅ Delivered</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{pending}</div>
          <div className="stat-label">📋 Pending Booking</div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Loading shipments…</div>
      ) : shipments.length === 0 ? (
        <div className="empty-state">
          No shipments found. Shipments appear after suppliers book couriers for confirmed pools.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Supplier</th>
                <th>Courier</th>
                <th>Tracking #</th>
                <th>Route</th>
                <th>Buyers</th>
                <th>Est. Delivery</th>
                <th>Status</th>
                <th>Track</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => {
                const meta = STATUS_META[s.status] ?? STATUS_META.pending;
                return (
                  <tr key={s.id}>
                    <td><strong>{s.product_name ?? '—'}</strong></td>
                    <td>{s.supplier_name ?? '—'}</td>
                    <td>{COURIER_LABEL[s.courier] ?? s.courier}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {s.tracking_number ?? '—'}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {s.origin_city} → {s.destination_city}
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
                      <a
                        href={`${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/tracking/${s.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                      >
                        View →
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

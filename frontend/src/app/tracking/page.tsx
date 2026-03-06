import Link from 'next/link';
import { Shipment } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const DEFAULT_BUYER_ID = 'a1000000-0000-0000-0000-000000000002'; // Sara Khan (in Sugar pool)

const COURIER_LABEL: Record<string, string> = {
  tcs: 'TCS', leopards: 'Leopards', postex: 'PostEx',
  mp: 'M&P', rider: 'Rider', dhl: 'DHL', other: 'Other',
};

const STATUS_META: Record<string, { icon: string; label: string; css: string }> = {
  pending:          { icon: '📋', label: 'Pending',           css: 'badge-pending' },
  booked:           { icon: '📦', label: 'Booked',            css: 'badge-orange' },
  picked_up:        { icon: '🚚', label: 'Picked Up',         css: 'badge-orange' },
  in_transit:       { icon: '🛣️', label: 'In Transit',        css: 'badge-orange' },
  out_for_delivery: { icon: '🏃', label: 'Out for Delivery',  css: 'badge-orange' },
  delivered:        { icon: '✅', label: 'Delivered',          css: 'badge-green' },
  failed:           { icon: '❌', label: 'Failed',             css: 'badge-grey' },
};

async function getBuyerShipments(): Promise<Shipment[]> {
  try {
    const res = await fetch(`${BASE_URL}/shipments/buyer/${DEFAULT_BUYER_ID}`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export default async function TrackingHistoryPage() {
  const shipments = await getBuyerShipments();

  const inTransit = shipments.filter((s) =>
    ['booked', 'picked_up', 'in_transit', 'out_for_delivery'].includes(s.status),
  ).length;
  const delivered = shipments.filter((s) => s.status === 'delivered').length;

  return (
    <main className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Shipments</h1>
          <p className="page-subtitle">Track your orders and deliveries.</p>
        </div>
        <Link href="/pools" className="btn-secondary">Browse Pools</Link>
      </div>

      {/* Summary stats */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-value">{shipments.length}</div>
          <div className="stat-label">Total Shipments</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{inTransit}</div>
          <div className="stat-label">🛣️ In Transit</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{delivered}</div>
          <div className="stat-label">✅ Delivered</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {shipments.filter((s) => s.status === 'pending').length}
          </div>
          <div className="stat-label">📋 Pending</div>
        </div>
      </div>

      {shipments.length === 0 ? (
        <div className="empty-state">
          <p>No shipments yet. Join a confirmed pool to place an order.</p>
          <Link href="/pools" className="btn-primary">Browse Pools</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {shipments.map((s) => {
            const meta = STATUS_META[s.status] ?? STATUS_META.pending;
            return (
              <div key={s.id} className="pool-card" style={{ cursor: 'default' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>
                      {s.product_name ?? 'Shipment'}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      📍 {s.origin_city} → {s.destination_city}
                      {s.tracking_number && (
                        <span style={{ marginLeft: '0.5rem', fontFamily: 'monospace' }}>
                          · {s.tracking_number}
                        </span>
                      )}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      🚛 {COURIER_LABEL[s.courier] ?? s.courier}
                      {s.estimated_delivery && (
                        <span style={{ marginLeft: '0.5rem' }}>
                          · Est. {new Date(s.estimated_delivery).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                    {s.my_quantity && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                        📦 Your quantity: {s.my_quantity.toLocaleString()} units
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <span className={`badge ${meta.css}`}>
                      {meta.icon} {meta.label}
                    </span>
                    <Link
                      href={`/tracking/${s.id}`}
                      className="btn-secondary"
                      style={{ padding: '0.3rem 0.75rem', fontSize: '0.85rem' }}
                    >
                      Track →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

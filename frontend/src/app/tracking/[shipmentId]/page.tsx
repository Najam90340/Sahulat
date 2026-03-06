import Link from 'next/link';
import { ShipmentDetail, ShipmentEvent, ShipmentMember } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const COURIER_LABEL: Record<string, string> = {
  tcs:      'TCS',
  leopards: 'Leopards Courier',
  postex:   'PostEx',
  mp:       'M&P Courier',
  rider:    'Rider',
  dhl:      'DHL Pakistan',
  other:    'Other',
};

const STATUS_META: Record<
  string,
  { icon: string; label: string; color: string; bg: string }
> = {
  pending:          { icon: '📋', label: 'Pending',           color: '#1e40af', bg: '#dbeafe' },
  booked:           { icon: '📦', label: 'Booked',            color: '#7c3aed', bg: '#ede9fe' },
  picked_up:        { icon: '🚚', label: 'Picked Up',         color: '#b45309', bg: '#fef3c7' },
  in_transit:       { icon: '🛣️', label: 'In Transit',        color: '#0369a1', bg: '#e0f2fe' },
  out_for_delivery: { icon: '🏃', label: 'Out for Delivery',  color: '#d97706', bg: '#fef3c7' },
  delivered:        { icon: '✅', label: 'Delivered',          color: '#166534', bg: '#dcfce7' },
  failed:           { icon: '❌', label: 'Failed',             color: '#991b1b', bg: '#fee2e2' },
};

const STATUS_ORDER = [
  'pending', 'booked', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered',
];

async function getShipment(id: string): Promise<ShipmentDetail | null> {
  try {
    const res = await fetch(`${BASE_URL}/shipments/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export default async function TrackingPage({
  params,
}: {
  params: Promise<{ shipmentId: string }>;
}) {
  const { shipmentId } = await params;
  const shipment = await getShipment(shipmentId);

  if (!shipment) {
    return (
      <main className="page-container" style={{ maxWidth: 720 }}>
        <div className="error-state">Shipment not found.</div>
        <Link href="/tracking" className="back-link">← My Shipments</Link>
      </main>
    );
  }

  const meta = STATUS_META[shipment.status] ?? STATUS_META.pending;
  const currentStepIndex = STATUS_ORDER.indexOf(shipment.status);

  return (
    <main className="page-container" style={{ maxWidth: 760 }}>
      <Link href="/tracking" className="back-link">← My Shipments</Link>

      {/* Header */}
      <div className="detail-card" style={{ marginTop: '1rem' }}>
        <div
          style={{
            background: meta.bg,
            borderRadius: 'var(--radius)',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <span style={{ fontSize: '2.5rem' }}>{meta.icon}</span>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: meta.color }}>
              {meta.label}
            </h1>
            <p style={{ color: meta.color, fontSize: '0.9rem', marginTop: '0.2rem' }}>
              {shipment.product_name} · {COURIER_LABEL[shipment.courier] ?? shipment.courier}
            </p>
          </div>
        </div>

        {/* Details grid */}
        <dl className="detail-grid">
          {shipment.tracking_number && (
            <>
              <dt>Tracking #</dt>
              <dd>
                <strong style={{ fontFamily: 'monospace' }}>{shipment.tracking_number}</strong>
              </dd>
            </>
          )}
          <dt>Courier</dt>
          <dd>{COURIER_LABEL[shipment.courier] ?? shipment.courier}</dd>
          <dt>Route</dt>
          <dd>{shipment.origin_city} → {shipment.destination_city}</dd>
          {shipment.estimated_delivery && (
            <>
              <dt>Est. Delivery</dt>
              <dd>{new Date(shipment.estimated_delivery).toLocaleDateString()}</dd>
            </>
          )}
          <dt>Supplier</dt>
          <dd>{shipment.supplier_name ?? '—'}</dd>
          <dt>Buyers</dt>
          <dd>{shipment.member_count ?? 0} member{(shipment.member_count ?? 0) !== 1 ? 's' : ''}</dd>
        </dl>

        {/* Visual step tracker */}
        <div style={{ margin: '1.5rem 0' }}>
          <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Shipment Progress</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
            {STATUS_ORDER.filter((s) => s !== 'failed').map((step, i) => {
              const stepMeta = STATUS_META[step];
              const isDone = currentStepIndex >= i && shipment.status !== 'failed';
              const isCurrent = step === shipment.status;
              return (
                <div
                  key={step}
                  style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 80 }}
                >
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: isDone ? '#16a34a' : '#e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 4px',
                        fontSize: isCurrent ? '1.1rem' : '0.9rem',
                        fontWeight: 700,
                        color: isDone ? '#fff' : '#9ca3af',
                        border: isCurrent ? '3px solid #16a34a' : 'none',
                        boxShadow: isCurrent ? '0 0 0 3px #bbf7d0' : 'none',
                      }}
                    >
                      {isDone ? '✓' : stepMeta.icon}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: isDone ? '#166534' : '#9ca3af', whiteSpace: 'nowrap' }}>
                      {stepMeta.label}
                    </div>
                  </div>
                  {i < STATUS_ORDER.filter((s) => s !== 'failed').length - 1 && (
                    <div
                      style={{
                        height: 3,
                        width: '100%',
                        background: currentStepIndex > i ? '#16a34a' : '#e5e7eb',
                        flex: 1,
                        marginBottom: 20,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tracking Timeline */}
        {shipment.events && shipment.events.length > 0 && (
          <div>
            <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Tracking Timeline</h2>
            <div
              style={{
                borderLeft: '2px solid #e5e7eb',
                paddingLeft: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              {[...shipment.events].reverse().map((event: ShipmentEvent, i: number) => {
                const evMeta = STATUS_META[event.status] ?? STATUS_META.pending;
                return (
                  <div key={event.id} style={{ position: 'relative' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: '-1.6rem',
                        top: '0.25rem',
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: i === 0 ? '#16a34a' : '#d1d5db',
                        border: '2px solid white',
                        boxShadow: '0 0 0 2px #e5e7eb',
                      }}
                    />
                    <div
                      style={{
                        background: i === 0 ? '#f0fdf4' : 'var(--surface)',
                        border: `1px solid ${i === 0 ? '#bbf7d0' : 'var(--border)'}`,
                        borderRadius: 'var(--radius)',
                        padding: '0.65rem 0.85rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.2rem',
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                          {evMeta.icon} {evMeta.label}
                          {event.location && (
                            <span
                              style={{
                                fontWeight: 400,
                                color: 'var(--text-muted)',
                                marginLeft: '0.4rem',
                              }}
                            >
                              · {event.location}
                            </span>
                          )}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {new Date(event.occurred_at).toLocaleString()}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                        {event.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Delivery Proof */}
        {shipment.proof && (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 'var(--radius)',
              padding: '1rem',
              marginTop: '1rem',
            }}
          >
            <h2 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>✅ Proof of Delivery</h2>
            <dl className="detail-grid">
              {shipment.proof.received_by && (
                <>
                  <dt>Received By</dt>
                  <dd>{shipment.proof.received_by}</dd>
                </>
              )}
              {shipment.proof.notes && (
                <>
                  <dt>Notes</dt>
                  <dd>{shipment.proof.notes}</dd>
                </>
              )}
              <dt>Confirmed</dt>
              <dd>{new Date(shipment.proof.confirmed_at).toLocaleString()}</dd>
            </dl>
            {shipment.proof.photo_url && (
              <div style={{ marginTop: '0.75rem' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shipment.proof.photo_url}
                  alt="Proof of delivery"
                  style={{ maxWidth: '100%', borderRadius: 'var(--radius)', maxHeight: 300, objectFit: 'cover' }}
                />
              </div>
            )}
          </div>
        )}

        {/* Members */}
        {shipment.members && shipment.members.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Buyers in this Shipment</h2>
            <table className="members-table">
              <thead>
                <tr>
                  <th>Buyer</th>
                  <th>Qty</th>
                  <th>Delivery Address</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {shipment.members.map((m: ShipmentMember) => {
                  const subMeta = STATUS_META[m.sub_status] ?? STATUS_META.pending;
                  return (
                    <tr key={m.id}>
                      <td>{m.buyer_name ?? '—'}</td>
                      <td>{m.quantity.toLocaleString()}</td>
                      <td style={{ fontSize: '0.85rem' }}>{m.delivery_address ?? '—'}</td>
                      <td>
                        <span
                          className="badge"
                          style={{ background: subMeta.bg, color: subMeta.color }}
                        >
                          {subMeta.icon} {subMeta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pool link */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          <Link href={`/pools/${shipment.pool_id}`} className="btn-secondary">
            View Pool
          </Link>
        </div>
      </div>
    </main>
  );
}

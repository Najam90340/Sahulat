import Link from 'next/link';
import { Rfq } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const STATUS_BADGE: Record<string, string> = {
  open:      'badge-blue',
  pooled:    'badge-orange',
  confirmed: 'badge-green',
  cancelled: 'badge-grey',
};

async function getOpenRfqs(): Promise<Rfq[]> {
  try {
    const res = await fetch(`${BASE_URL}/rfqs?status=open`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

async function getPooledRfqs(): Promise<Rfq[]> {
  try {
    const res = await fetch(`${BASE_URL}/rfqs?status=pooled`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export default async function SupplierRfqsPage() {
  const [openRfqs, pooledRfqs] = await Promise.all([getOpenRfqs(), getPooledRfqs()]);
  const rfqs = [...openRfqs, ...pooledRfqs];

  return (
    <main className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">RFQs &amp; Pool Requests</h1>
          <p className="page-subtitle">Browse open buyer requests and submit your best quote.</p>
        </div>
        <Link href="/supplier/dashboard" className="btn-secondary">
          ← Dashboard
        </Link>
      </div>

      {rfqs.length === 0 ? (
        <div className="empty-state">
          <p>No open RFQs at the moment. Check back soon.</p>
        </div>
      ) : (
        <div className="card-grid">
          {rfqs.map((rfq) => (
            <div key={rfq.id} className="rfq-card">
              <div className="rfq-card-header">
                <h2>{rfq.product_name}</h2>
                <span className={`badge ${STATUS_BADGE[rfq.status] ?? 'badge-grey'}`}>
                  {rfq.status}
                </span>
              </div>
              <div className="rfq-card-body">
                <p>
                  <strong>Qty:</strong> {rfq.quantity.toLocaleString()} units
                </p>
                <p>
                  <strong>City:</strong> {rfq.city}
                </p>
                {rfq.description && <p className="rfq-desc">{rfq.description}</p>}
              </div>
              <div className="rfq-card-footer">
                <span className="buyer-name">👤 {rfq.buyer_name ?? 'Buyer'}</span>
                <span className="rfq-date">
                  {new Date(rfq.created_at).toLocaleDateString()}
                </span>
              </div>
              <Link
                href={`/supplier/rfqs/${rfq.id}/quote`}
                className="btn-primary"
                style={{ textAlign: 'center', marginTop: '0.5rem' }}
              >
                Submit Quote
              </Link>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

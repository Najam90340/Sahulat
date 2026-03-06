import Link from 'next/link';
import { Rfq } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const STATUS_BADGE: Record<string, string> = {
  open: 'badge-blue',
  pooled: 'badge-orange',
  confirmed: 'badge-green',
  cancelled: 'badge-grey',
};

async function getRfqs(): Promise<Rfq[]> {
  try {
    const res = await fetch(`${BASE_URL}/rfqs`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export default async function RfqListPage() {
  const rfqs = await getRfqs();

  return (
    <main className="page-container">
      <div className="page-header">
        <h1 className="page-title">Requests for Quote</h1>
        <Link href="/rfq/new" className="btn-primary">
          + Post RFQ
        </Link>
      </div>

      {rfqs.length === 0 ? (
        <div className="empty-state">
          <p>No RFQs yet.</p>
          <Link href="/rfq/new" className="btn-primary">
            Be the first to post an RFQ
          </Link>
        </div>
      ) : (
        <div className="card-grid">
          {rfqs.map((rfq) => (
            <Link href={`/rfq/${rfq.id}`} key={rfq.id} className="rfq-card">
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
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

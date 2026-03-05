import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Rfq } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function getRfq(id: string): Promise<Rfq | null> {
  try {
    const res = await fetch(`${BASE_URL}/rfqs/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export default async function RfqDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rfq = await getRfq(id);
  if (!rfq) notFound();

  return (
    <main className="page-container">
      <Link href="/rfq" className="back-link">← All RFQs</Link>

      <div className="detail-card">
        <div className="detail-header">
          <h1>{rfq.product_name}</h1>
          <span className={`badge badge-${rfq.status}`}>{rfq.status}</span>
        </div>

        <dl className="detail-grid">
          <dt>Quantity</dt>
          <dd>{rfq.quantity.toLocaleString()} units</dd>
          <dt>City</dt>
          <dd>{rfq.city}</dd>
          {rfq.buyer_name && (
            <>
              <dt>Buyer</dt>
              <dd>{rfq.buyer_name}</dd>
            </>
          )}
          {rfq.description && (
            <>
              <dt>Description</dt>
              <dd>{rfq.description}</dd>
            </>
          )}
          <dt>Posted</dt>
          <dd>{new Date(rfq.created_at).toLocaleString()}</dd>
        </dl>

        {rfq.images && rfq.images.length > 0 && (
          <div className="image-gallery">
            {rfq.images.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt={`${rfq.product_name} image ${i + 1}`} className="gallery-img" />
            ))}
          </div>
        )}

        {rfq.pool ? (
          <div className="linked-pool">
            <h2>Buying Pool</h2>
            <p>
              This RFQ is part of a buying pool.{' '}
              <Link href={`/pools/${rfq.pool.id}`} className="link">
                View Pool →
              </Link>
            </p>
          </div>
        ) : (
          rfq.status === 'open' && (
            <div className="linked-pool">
              <p className="muted">No pool yet. Post your RFQ and we&apos;ll create one if needed.</p>
            </div>
          )
        )}
      </div>
    </main>
  );
}

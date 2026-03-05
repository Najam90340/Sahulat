import Link from 'next/link';
import { Transaction } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const STATUS_META: Record<
  string,
  { icon: string; label: string; css: string; message: string }
> = {
  initiated: {
    icon: '⏳',
    label: 'Initiated',
    css: 'badge-pending',
    message: 'Your payment has been initiated. For bank transfers, please complete the transfer using the details provided.',
  },
  held: {
    icon: '🔒',
    label: 'Held in Escrow',
    css: 'badge-orange',
    message: 'Your payment is securely held in escrow. It will be released to the supplier once you confirm delivery.',
  },
  released: {
    icon: '✅',
    label: 'Released',
    css: 'badge-green',
    message: 'Funds have been released to the supplier. Thank you for your order!',
  },
  refunded: {
    icon: '↩️',
    label: 'Refunded',
    css: 'badge-grey',
    message: 'Your payment has been refunded. Please allow 3–5 business days for the amount to reflect in your account.',
  },
  failed: {
    icon: '❌',
    label: 'Failed',
    css: 'badge-grey',
    message: 'Your payment could not be processed. Please try again with a different payment method.',
  },
};

const METHOD_LABEL: Record<string, string> = {
  easypaisa: 'Easypaisa',
  jazzcash: 'JazzCash',
  bank_transfer: 'Bank Transfer',
  card: 'Card',
};

async function getTransaction(id: string): Promise<Transaction | null> {
  try {
    const res = await fetch(`${BASE_URL}/payments/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export default async function TransactionStatusPage({
  params,
}: {
  params: Promise<{ txnId: string }>;
}) {
  const { txnId } = await params;
  const txn = await getTransaction(txnId);

  if (!txn) {
    return (
      <main className="page-container">
        <div className="error-state">Transaction not found.</div>
        <Link href="/payment/history" className="back-link">← My Payments</Link>
      </main>
    );
  }

  const meta = STATUS_META[txn.status] ?? STATUS_META.initiated;

  return (
    <main className="page-container" style={{ maxWidth: 640 }}>
      <Link href="/payment/history" className="back-link">← My Payments</Link>

      <div className="detail-card" style={{ marginTop: '1rem' }}>
        {/* Status banner */}
        <div
          style={{
            textAlign: 'center',
            padding: '2rem 1rem',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>{meta.icon}</div>
          <h1 className="page-title">{meta.label}</h1>
          <span className={`badge ${meta.css}`} style={{ marginTop: '0.5rem' }}>
            {txn.status.toUpperCase()}
          </span>
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {meta.message}
          </p>
        </div>

        {/* Transaction details */}
        <dl className="detail-grid">
          <dt>Transaction ID</dt>
          <dd style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{txn.id}</dd>

          <dt>Product</dt>
          <dd>{txn.pool_product_name ?? '—'}</dd>

          <dt>Amount</dt>
          <dd>
            <strong>PKR {Number(txn.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
          </dd>

          <dt>Payment Method</dt>
          <dd>{METHOD_LABEL[txn.payment_method] ?? txn.payment_method}</dd>

          {txn.gateway_ref && (
            <>
              <dt>Gateway Ref</dt>
              <dd style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{txn.gateway_ref}</dd>
            </>
          )}

          <dt>Initiated</dt>
          <dd>{new Date(txn.initiated_at).toLocaleString()}</dd>

          {txn.held_at && (
            <>
              <dt>Held at</dt>
              <dd>{new Date(txn.held_at).toLocaleString()}</dd>
            </>
          )}

          {txn.released_at && (
            <>
              <dt>Released at</dt>
              <dd>{new Date(txn.released_at).toLocaleString()}</dd>
            </>
          )}

          {txn.refunded_at && (
            <>
              <dt>Refunded at</dt>
              <dd>{new Date(txn.refunded_at).toLocaleString()}</dd>
            </>
          )}
        </dl>

        {/* Bank transfer details */}
        {txn.payment_method === 'bank_transfer' &&
          txn.status === 'initiated' &&
          txn.metadata && (
            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 'var(--radius)',
                padding: '1rem',
                marginTop: '0.5rem',
              }}
            >
              <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>🏦 Bank Transfer Details</h3>
              <dl className="detail-grid" style={{ fontSize: '0.9rem' }}>
                {Object.entries(txn.metadata as Record<string, unknown>).map(([k, v]) => (
                  <span key={k} style={{ display: 'contents' }}>
                    <dt style={{ textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</dt>
                    <dd style={{ fontWeight: k === 'payment_reference' ? 700 : 400 }}>
                      {String(v)}
                    </dd>
                  </span>
                ))}
              </dl>
            </div>
          )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '0.5rem' }}>
          {txn.pool_id && (
            <Link href={`/pools/${txn.pool_id}`} className="btn-secondary">
              View Pool
            </Link>
          )}
          <Link href="/payment/history" className="btn-secondary">
            All Payments
          </Link>
          {txn.status === 'failed' && txn.pool_id && (
            <Link href={`/payment/${txn.pool_id}`} className="btn-primary">
              Try Again
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

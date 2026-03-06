import Link from 'next/link';
import { Transaction } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Default buyer for demo – in production this comes from the auth session
const DEFAULT_BUYER_ID = 'a1000000-0000-0000-0000-000000000001';

const STATUS_BADGE: Record<string, string> = {
  initiated: 'badge-pending',
  held:      'badge-orange',
  released:  'badge-green',
  refunded:  'badge-grey',
  failed:    'badge-grey',
};

const STATUS_ICON: Record<string, string> = {
  initiated: '⏳',
  held:      '🔒',
  released:  '✅',
  refunded:  '↩️',
  failed:    '❌',
};

const METHOD_LABEL: Record<string, string> = {
  easypaisa:     '📱 Easypaisa',
  jazzcash:      '💳 JazzCash',
  bank_transfer: '🏦 Bank Transfer',
  card:          '💳 Card',
};

async function getBuyerTransactions(): Promise<Transaction[]> {
  try {
    const res = await fetch(`${BASE_URL}/payments/buyer/${DEFAULT_BUYER_ID}`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export default async function PaymentHistoryPage() {
  const transactions = await getBuyerTransactions();

  const totalHeld = transactions
    .filter((t) => t.status === 'held')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalPaid = transactions
    .filter((t) => t.status === 'released')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <main className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Payments</h1>
          <p className="page-subtitle">Your escrow payment history.</p>
        </div>
        <Link href="/pools" className="btn-secondary">Browse Pools</Link>
      </div>

      {/* Summary stats */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-value">{transactions.length}</div>
          <div className="stat-label">Total Transactions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">PKR {totalHeld.toLocaleString()}</div>
          <div className="stat-label">🔒 Held in Escrow</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">PKR {totalPaid.toLocaleString()}</div>
          <div className="stat-label">✅ Released / Paid</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {transactions.filter((t) => t.status === 'refunded').length}
          </div>
          <div className="stat-label">↩️ Refunded</div>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="empty-state">
          <p>No payment history yet.</p>
          <Link href="/pools" className="btn-primary">Browse Confirmed Pools</Link>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="members-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Amount (PKR)</th>
                <th>Method</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn) => (
                <tr key={txn.id}>
                  <td>
                    <strong>{txn.pool_product_name ?? '—'}</strong>
                    {txn.city && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{txn.city}</div>
                    )}
                  </td>
                  <td>PKR {Number(txn.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td>{METHOD_LABEL[txn.payment_method] ?? txn.payment_method}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[txn.status] ?? 'badge-grey'}`}>
                      {STATUS_ICON[txn.status]} {txn.status}
                    </span>
                  </td>
                  <td>{new Date(txn.initiated_at).toLocaleDateString()}</td>
                  <td>
                    <Link
                      href={`/payment/status/${txn.id}`}
                      className="btn-secondary"
                      style={{ padding: '0.25rem 0.65rem', fontSize: '0.85rem' }}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

type TransactionStatus = 'initiated' | 'held' | 'released' | 'refunded' | 'failed';

interface Transaction {
  id: string;
  pool_id: string;
  buyer_name?: string;
  pool_product_name?: string;
  amount: number;
  currency: string;
  payment_method: string;
  gateway_ref?: string;
  status: TransactionStatus;
  initiated_at: string;
  held_at?: string;
  released_at?: string;
  refunded_at?: string;
}

// Demo pool with sample transactions
const DEMO_POOL_ID = 'd1000000-0000-0000-0000-000000000002';

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

export default function AdminPaymentsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/payments/pool/${DEMO_POOL_ID}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load transactions');
      const json = await res.json();
      setTransactions(json.data ?? []);
    } catch {
      setError('Failed to load transactions. Ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleAction = async (txnId: string, action: 'release' | 'refund') => {
    setActionLoading(txnId);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/payments/${txnId}/${action}`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || 'Action failed');
      }
      setSuccessMsg(`Transaction ${action}d successfully.`);
      await loadTransactions();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const totalHeld = transactions
    .filter((t) => t.status === 'held')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalReleased = transactions
    .filter((t) => t.status === 'released')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <h1 className="page-title">Escrow Payments</h1>
      </div>
      <p className="page-subtitle">
        Manage escrow transactions — release funds after delivery or issue refunds for failed pools.
      </p>

      {/* Summary stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{transactions.length}</div>
          <div className="stat-label">Total Transactions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {transactions.filter((t) => t.status === 'held').length}
          </div>
          <div className="stat-label">🔒 Held in Escrow</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">PKR {totalHeld.toLocaleString()}</div>
          <div className="stat-label">Escrow Value</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">PKR {totalReleased.toLocaleString()}</div>
          <div className="stat-label">✅ Released</div>
        </div>
      </div>

      {successMsg && <div className="alert alert-success">{successMsg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Loading transactions…</div>
      ) : transactions.length === 0 ? (
        <div className="empty-state">
          No transactions found. Transactions appear after buyers pay for confirmed pools.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Buyer</th>
                <th>Product</th>
                <th>Amount (PKR)</th>
                <th>Method</th>
                <th>Gateway Ref</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn) => {
                const isUpdating = actionLoading === txn.id;
                return (
                  <tr key={txn.id}>
                    <td>{txn.buyer_name ?? '—'}</td>
                    <td>{txn.pool_product_name ?? '—'}</td>
                    <td>PKR {Number(txn.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td>{METHOD_LABEL[txn.payment_method] ?? txn.payment_method}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {txn.gateway_ref ?? '—'}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[txn.status] ?? 'badge-grey'}`}>
                        {STATUS_ICON[txn.status]} {txn.status}
                      </span>
                    </td>
                    <td>{new Date(txn.initiated_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {txn.status === 'held' && (
                          <>
                            <button
                              className="btn-primary btn-sm btn-success"
                              disabled={isUpdating}
                              onClick={() => handleAction(txn.id, 'release')}
                            >
                              {isUpdating ? '…' : '✅ Release'}
                            </button>
                            <button
                              className="btn-primary btn-sm btn-danger"
                              disabled={isUpdating}
                              onClick={() => handleAction(txn.id, 'refund')}
                            >
                              {isUpdating ? '…' : '↩️ Refund'}
                            </button>
                          </>
                        )}
                        {txn.status === 'initiated' && (
                          <button
                            className="btn-primary btn-sm btn-danger"
                            disabled={isUpdating}
                            onClick={() => handleAction(txn.id, 'refund')}
                          >
                            {isUpdating ? '…' : '↩️ Refund'}
                          </button>
                        )}
                        {['released', 'refunded', 'failed'].includes(txn.status) && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
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
    </>
  );
}

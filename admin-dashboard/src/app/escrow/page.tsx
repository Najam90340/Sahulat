'use client';

import { useState, useEffect, useCallback } from 'react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface EscrowSummary {
  total_held: number;
  total_released: number;
  total_refunded: number;
  held_count: number;
  released_count: number;
  released_today: number;
}

interface EscrowTransaction {
  id: string;
  pool_id: string;
  buyer_id: string;
  buyer_name?: string;
  pool_product?: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  initiated_at: string;
  held_at?: string;
}

const METHOD_LABEL: Record<string, string> = {
  easypaisa:     '📱 Easypaisa',
  jazzcash:      '💳 JazzCash',
  bank_transfer: '🏦 Bank Transfer',
  card:          '💳 Card',
};

const STATUS_BADGE: Record<string, string> = {
  initiated: 'badge-pending',
  held:      'badge-orange',
  released:  'badge-green',
  refunded:  'badge-grey',
  failed:    'badge-grey',
};

export default function EscrowPage() {
  const [summary, setSummary] = useState<EscrowSummary | null>(null);
  const [transactions, setTransactions] = useState<EscrowTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/admin/escrow`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setSummary(json.data?.summary ?? null);
      setTransactions(json.data?.transactions ?? []);
    } catch {
      setError('Failed to load escrow data. Ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAction = async (txnId: string, action: 'release' | 'refund') => {
    setActionLoading(txnId);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/payments/${txnId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_override: true }),
      });
      if (!res.ok) throw new Error('Action failed');
      setSuccess(`Transaction ${action === 'release' ? 'released ✅' : 'refunded ↩️'} successfully.`);
      await loadData();
      setTimeout(() => setSuccess(''), 4000);
    } catch {
      setError(`Failed to ${action} transaction.`);
    } finally {
      setActionLoading(null);
    }
  };

  const fmt = (n: number | string) =>
    `PKR ${Number(n).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <>
      <h1 className="page-title">🔒 Escrow Management</h1>
      <p className="page-subtitle">
        Monitor held payments, release funds to suppliers, or refund buyers when disputes
        are resolved.
      </p>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Summary KPIs */}
      {summary && (
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#d97706' }}>{fmt(summary.total_held)}</div>
            <div className="stat-label">🔒 Total Held</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#16a34a' }}>{fmt(summary.total_released)}</div>
            <div className="stat-label">✅ Total Released</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#6b7280' }}>{fmt(summary.total_refunded)}</div>
            <div className="stat-label">↩️ Total Refunded</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{summary.held_count}</div>
            <div className="stat-label">Transactions in Escrow</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#16a34a' }}>{fmt(summary.released_today)}</div>
            <div className="stat-label">Released Today</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{summary.released_count}</div>
            <div className="stat-label">Transactions Released</div>
          </div>
        </div>
      )}

      {/* Escrow utilization bar */}
      {summary && (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
            <span>Escrow Utilization</span>
            <span>
              {fmt(summary.total_held)} held out of{' '}
              {fmt(Number(summary.total_held) + Number(summary.total_released))} total processed
            </span>
          </div>
          {(() => {
            const total = Number(summary.total_held) + Number(summary.total_released) + Number(summary.total_refunded);
            const heldPct  = total ? (Number(summary.total_held) / total) * 100 : 0;
            const relPct   = total ? (Number(summary.total_released) / total) * 100 : 0;
            const refPct   = total ? (Number(summary.total_refunded) / total) * 100 : 0;
            return (
              <div style={{ display: 'flex', height: 14, borderRadius: 99, overflow: 'hidden', background: '#f3f4f6' }}>
                <div style={{ width: `${heldPct}%`, background: '#f59e0b' }} title={`Held: ${heldPct.toFixed(1)}%`} />
                <div style={{ width: `${relPct}%`, background: '#22c55e' }} title={`Released: ${relPct.toFixed(1)}%`} />
                <div style={{ width: `${refPct}%`, background: '#9ca3af' }} title={`Refunded: ${refPct.toFixed(1)}%`} />
              </div>
            );
          })()}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#f59e0b' }} />
              Held
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#22c55e' }} />
              Released
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#9ca3af' }} />
              Refunded
            </span>
          </div>
        </div>
      )}

      {/* Transactions table */}
      <h2 className="section-title">Held Transactions</h2>
      {loading ? (
        <div className="loading">Loading escrow data…</div>
      ) : transactions.length === 0 ? (
        <div className="empty-state">No held transactions.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Buyer</th>
                <th>Product</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Held Since</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => {
                const isLoading = actionLoading === t.id;
                return (
                  <tr key={t.id}>
                    <td><strong>{t.buyer_name ?? t.buyer_id}</strong></td>
                    <td>{t.pool_product ?? '—'}</td>
                    <td style={{ fontWeight: 700 }}>{fmt(t.amount)}</td>
                    <td>{METHOD_LABEL[t.payment_method] ?? t.payment_method}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[t.status] ?? 'badge-grey'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td>
                      {t.held_at
                        ? new Date(t.held_at).toLocaleString()
                        : new Date(t.initiated_at).toLocaleString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          className="btn-primary btn-sm btn-success"
                          disabled={isLoading || t.status !== 'held'}
                          onClick={() => handleAction(t.id, 'release')}
                          title="Release funds to supplier"
                        >
                          {isLoading ? '…' : '✅ Release'}
                        </button>
                        <button
                          className="btn-primary btn-sm btn-danger"
                          disabled={isLoading || t.status !== 'held'}
                          onClick={() => handleAction(t.id, 'refund')}
                          title="Refund buyer"
                        >
                          {isLoading ? '…' : '↩️ Refund'}
                        </button>
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

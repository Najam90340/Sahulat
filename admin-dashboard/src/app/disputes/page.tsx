'use client';

import { useState, useEffect, useCallback } from 'react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

type DisputeStatus =
  | 'open'
  | 'investigating'
  | 'resolved_buyer'
  | 'resolved_supplier'
  | 'rejected';

interface Dispute {
  id: string;
  transaction_id?: string;
  buyer_name?: string;
  supplier_name?: string;
  pool_product?: string;
  transaction_amount?: number;
  reason: string;
  status: DisputeStatus;
  resolution?: string;
  admin_note?: string;
  raised_by: string;
  created_at: string;
  resolved_at?: string;
}

const STATUS_CONFIG: Record<
  DisputeStatus,
  { label: string; badge: string; icon: string }
> = {
  open:               { label: 'Open',              badge: 'badge-pending', icon: '📬' },
  investigating:      { label: 'Investigating',     badge: 'badge-orange',  icon: '🔍' },
  resolved_buyer:     { label: 'Resolved (Buyer)',  badge: 'badge-green',   icon: '✅' },
  resolved_supplier:  { label: 'Resolved (Supplier)', badge: 'badge-verified', icon: '✅' },
  rejected:           { label: 'Rejected',          badge: 'badge-grey',    icon: '❌' },
};

const ALL_STATUSES: DisputeStatus[] = [
  'open', 'investigating', 'resolved_buyer', 'resolved_supplier', 'rejected',
];

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [newStatus, setNewStatus] = useState<DisputeStatus>('investigating');
  const [resolution, setResolution] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadDisputes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const url =
        filter === 'all'
          ? `${BASE_URL}/admin/disputes`
          : `${BASE_URL}/admin/disputes?status=${filter}`;
      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json();
      setDisputes(json.data ?? []);
    } catch {
      setError('Failed to load disputes.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadDisputes(); }, [loadDisputes]);

  const openPanel = (d: Dispute) => {
    setSelected(d);
    setNewStatus(d.status);
    setResolution(d.resolution ?? '');
    setAdminNote(d.admin_note ?? '');
    setError('');
    setSuccess('');
  };

  const handleUpdate = async () => {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/admin/disputes/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, resolution, admin_note: adminNote }),
      });
      if (!res.ok) throw new Error('Update failed');
      setSuccess('Dispute updated successfully.');
      setSelected(null);
      await loadDisputes();
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to update dispute.');
    } finally {
      setSaving(false);
    }
  };

  const openCount = disputes.filter((d) => d.status === 'open').length;
  const investCount = disputes.filter((d) => d.status === 'investigating').length;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <h1 className="page-title">⚖️ Dispute Resolution</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {openCount > 0 && <span className="badge badge-pending">{openCount} Open</span>}
          {investCount > 0 && <span className="badge badge-orange">{investCount} Investigating</span>}
        </div>
      </div>
      <p className="page-subtitle">
        Review and resolve disputes between buyers and suppliers. Decisions may trigger escrow
        release or refund.
      </p>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {['all', ...ALL_STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: '0.3rem 0.85rem',
              borderRadius: '999px',
              border: '1.5px solid',
              borderColor: filter === s ? 'var(--primary)' : 'var(--border)',
              background: filter === s ? 'var(--primary)' : 'var(--surface)',
              color: filter === s ? '#fff' : 'var(--text)',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}
          >
            {s === 'all' ? 'All' : STATUS_CONFIG[s as DisputeStatus].label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
        {ALL_STATUSES.map((s) => {
          const cnt = disputes.filter((d) => d.status === s).length;
          return (
            <div key={s} className="stat-card">
              <div className="stat-value" style={{ fontSize: '1.5rem' }}>{cnt}</div>
              <div className="stat-label">
                {STATUS_CONFIG[s].icon} {STATUS_CONFIG[s].label}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* Dispute list */}
        <div style={{ flex: 1, overflowX: 'auto' }}>
          {loading ? (
            <div className="loading">Loading disputes…</div>
          ) : disputes.length === 0 ? (
            <div className="empty-state">
              No disputes{filter !== 'all' ? ` with status "${filter}"` : ''}.
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Raised By</th>
                  <th>Buyer</th>
                  <th>Supplier</th>
                  <th>Product</th>
                  <th>Amount</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {disputes.map((d) => {
                  const cfg = STATUS_CONFIG[d.status];
                  return (
                    <tr key={d.id}>
                      <td>
                        <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                          {d.raised_by === 'buyer' ? '👤 Buyer' : '🏭 Supplier'}
                        </span>
                      </td>
                      <td>{d.buyer_name}</td>
                      <td>{d.supplier_name}</td>
                      <td>{d.pool_product ?? '—'}</td>
                      <td>
                        {d.transaction_amount
                          ? `PKR ${Number(d.transaction_amount).toLocaleString()}`
                          : '—'}
                      </td>
                      <td style={{ maxWidth: 200 }}>
                        <span
                          title={d.reason}
                          style={{
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {d.reason}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${cfg.badge}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>
                      <td>{new Date(d.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="btn-primary btn-sm"
                          onClick={() => openPanel(d)}
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Resolution Panel */}
        {selected && (
          <div
            style={{
              width: 340,
              flexShrink: 0,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '1.25rem',
              boxShadow: 'var(--shadow)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>⚖️ Review Dispute</h3>
              <button
                onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '1.1rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              <strong>Raised by:</strong>{' '}
              {selected.raised_by === 'buyer' ? '👤 ' + selected.buyer_name : '🏭 ' + selected.supplier_name}
            </div>
            <div style={{ fontSize: '0.85rem', marginBottom: '0.75rem', lineHeight: 1.5 }}>
              <strong>Reason:</strong>
              <p style={{ marginTop: '0.25rem', color: '#374151' }}>{selected.reason}</p>
            </div>

            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as DisputeStatus)}
              style={{
                width: '100%',
                padding: '0.4rem 0.6rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                fontSize: '0.85rem',
                marginBottom: '0.75rem',
              }}
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_CONFIG[s].icon} {STATUS_CONFIG[s].label}
                </option>
              ))}
            </select>

            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Resolution (public)
            </label>
            <textarea
              rows={3}
              style={{
                width: '100%',
                padding: '0.4rem 0.6rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                fontSize: '0.85rem',
                marginBottom: '0.75rem',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
              placeholder="Describe the resolution visible to both parties…"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
            />

            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Admin Note (internal)
            </label>
            <textarea
              rows={2}
              style={{
                width: '100%',
                padding: '0.4rem 0.6rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                fontSize: '0.85rem',
                marginBottom: '1rem',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
              placeholder="Internal notes not shown to users…"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
            />

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={handleUpdate}
                disabled={saving}
              >
                {saving ? 'Saving…' : '💾 Save Decision'}
              </button>
              <button
                className="btn-secondary"
                onClick={() => setSelected(null)}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

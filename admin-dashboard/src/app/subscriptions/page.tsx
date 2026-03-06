'use client';

import { useState, useEffect, useCallback } from 'react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

type SubscriptionPlan   = 'basic' | 'pro' | 'enterprise';
type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

interface Subscription {
  id: string;
  supplier_id: string;
  supplier_name?: string;
  supplier_email?: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  amount: number;
  currency: string;
  starts_at: string;
  expires_at?: string;
  notes?: string;
  created_at: string;
}

const PLAN_CONFIG: Record<SubscriptionPlan, { label: string; badge: string; icon: string; color: string }> = {
  basic:      { label: 'Basic',      badge: 'badge-grey',   icon: '🔵', color: '#6b7280' },
  pro:        { label: 'Pro',        badge: 'badge-blue',   icon: '⭐', color: '#2563eb' },
  enterprise: { label: 'Enterprise', badge: 'badge-premium',icon: '👑', color: '#9a3412' },
};

const STATUS_BADGE: Record<SubscriptionStatus, string> = {
  active:    'badge-green',
  expired:   'badge-grey',
  cancelled: 'badge-grey',
};

const PLAN_PRICES: Record<SubscriptionPlan, number> = {
  basic:      999,
  pro:        4999,
  enterprise: 14999,
};

interface Supplier { id: string; name: string; email: string; }

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // New subscription form
  const [newSupplierId, setNewSupplierId] = useState('');
  const [newPlan, setNewPlan] = useState<SubscriptionPlan>('basic');
  const [newExpiry, setNewExpiry] = useState('');

  // Edit form
  const [editStatus, setEditStatus] = useState<SubscriptionStatus>('active');
  const [editPlan, setEditPlan] = useState<SubscriptionPlan>('basic');
  const [editExpiry, setEditExpiry] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [subsRes, suppRes] = await Promise.all([
        fetch(`${BASE_URL}/admin/subscriptions`, { cache: 'no-store' }),
        fetch(`${BASE_URL}/admin/suppliers`, { cache: 'no-store' }),
      ]);
      const subsJson = await subsRes.json();
      const suppJson = await suppRes.json();
      setSubscriptions(subsJson.data ?? []);
      setSuppliers(suppJson.data ?? []);
    } catch {
      setError('Failed to load subscriptions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    if (!newSupplierId || !newPlan) return;
    setSaving(true);
    setError('');
    try {
      const expiresAt = newExpiry
        ? new Date(newExpiry).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const res = await fetch(`${BASE_URL}/admin/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: newSupplierId,
          plan: newPlan,
          amount: PLAN_PRICES[newPlan],
          currency: 'PKR',
          expires_at: expiresAt,
        }),
      });
      if (!res.ok) throw new Error('Create failed');
      setSuccess('Subscription created.');
      setShowCreate(false);
      setNewSupplierId('');
      setNewPlan('basic');
      setNewExpiry('');
      await loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to create subscription.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (s: Subscription) => {
    setEditing(s);
    setEditStatus(s.status);
    setEditPlan(s.plan);
    setEditExpiry(s.expires_at ? new Date(s.expires_at).toISOString().split('T')[0] : '');
    setEditNotes(s.notes ?? '');
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/admin/subscriptions/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: editPlan,
          status: editStatus,
          amount: PLAN_PRICES[editPlan],
          expires_at: editExpiry ? new Date(editExpiry).toISOString() : undefined,
          notes: editNotes,
        }),
      });
      if (!res.ok) throw new Error('Update failed');
      setSuccess('Subscription updated.');
      setEditing(null);
      await loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to update subscription.');
    } finally {
      setSaving(false);
    }
  };

  const activeCount  = subscriptions.filter((s) => s.status === 'active').length;
  const totalMRR     = subscriptions
    .filter((s) => s.status === 'active')
    .reduce((acc, s) => acc + Number(s.amount), 0);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <h1 className="page-title">📦 Subscriptions</h1>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>+ New Subscription</button>
      </div>
      <p className="page-subtitle">
        Manage supplier subscription plans (Basic, Pro, Enterprise). Subscriptions unlock
        premium features like priority listing and advanced analytics.
      </p>

      {success && <div className="alert alert-success">{success}</div>}
      {error   && <div className="alert alert-error">{error}</div>}

      {/* KPIs */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#16a34a' }}>{activeCount}</div>
          <div className="stat-label">Active Subscriptions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">PKR {totalMRR.toLocaleString()}</div>
          <div className="stat-label">Monthly Revenue (MRR)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{subscriptions.filter((s) => s.plan === 'pro').length}</div>
          <div className="stat-label">⭐ Pro</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{subscriptions.filter((s) => s.plan === 'enterprise').length}</div>
          <div className="stat-label">👑 Enterprise</div>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div
          style={{
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: 'var(--radius)',
            padding: '1.25rem',
            marginBottom: '1.25rem',
          }}
        >
          <h3 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>➕ New Subscription</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Supplier</label>
              <select
                value={newSupplierId}
                onChange={(e) => setNewSupplierId(e.target.value)}
                style={{ padding: '0.4rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', minWidth: 180 }}
              >
                <option value="">Select supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Plan</label>
              <select
                value={newPlan}
                onChange={(e) => setNewPlan(e.target.value as SubscriptionPlan)}
                style={{ padding: '0.4rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
              >
                <option value="basic">🔵 Basic – PKR 999/mo</option>
                <option value="pro">⭐ Pro – PKR 4,999/mo</option>
                <option value="enterprise">👑 Enterprise – PKR 14,999/mo</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Expires</label>
              <input
                type="date"
                value={newExpiry}
                onChange={(e) => setNewExpiry(e.target.value)}
                style={{ padding: '0.4rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-primary btn-success" onClick={handleCreate} disabled={saving || !newSupplierId}>
                {saving ? 'Saving…' : '✅ Create'}
              </button>
              <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Subscriptions table */}
      {loading ? (
        <div className="loading">Loading subscriptions…</div>
      ) : subscriptions.length === 0 ? (
        <div className="empty-state">No subscriptions yet.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Email</th>
                <th>Plan</th>
                <th>Amount/mo</th>
                <th>Status</th>
                <th>Expires</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((s) => {
                const plan = PLAN_CONFIG[s.plan];
                const isExpired = s.expires_at && new Date(s.expires_at) < new Date();
                return (
                  <tr key={s.id}>
                    <td><strong>{s.supplier_name}</strong></td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{s.supplier_email}</td>
                    <td>
                      <span className={`badge ${plan.badge}`} style={{ color: plan.color }}>
                        {plan.icon} {plan.label}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      PKR {Number(s.amount).toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[s.status]}`}>
                        {s.status === 'active' && !isExpired ? '🟢' : '⚪'} {s.status}
                      </span>
                    </td>
                    <td style={{ color: isExpired ? 'var(--danger)' : undefined }}>
                      {s.expires_at
                        ? new Date(s.expires_at).toLocaleDateString()
                        : '∞ No expiry'}
                    </td>
                    <td>
                      <button className="btn-primary btn-sm" onClick={() => openEdit(s)}>
                        ✏️ Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
          }}
          onClick={(e) => e.target === e.currentTarget && setEditing(null)}
        >
          <div
            style={{
              background: 'white', borderRadius: 'var(--radius)', padding: '1.5rem',
              width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>
              ✏️ Edit Subscription — {editing.supplier_name}
            </h3>

            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Plan</label>
            <select
              value={editPlan}
              onChange={(e) => setEditPlan(e.target.value as SubscriptionPlan)}
              style={{ width: '100%', padding: '0.4rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '0.75rem' }}
            >
              <option value="basic">🔵 Basic – PKR 999/mo</option>
              <option value="pro">⭐ Pro – PKR 4,999/mo</option>
              <option value="enterprise">👑 Enterprise – PKR 14,999/mo</option>
            </select>

            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Status</label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as SubscriptionStatus)}
              style={{ width: '100%', padding: '0.4rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '0.75rem' }}
            >
              <option value="active">🟢 Active</option>
              <option value="expired">⚪ Expired</option>
              <option value="cancelled">⚪ Cancelled</option>
            </select>

            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Expiry Date</label>
            <input
              type="date"
              value={editExpiry}
              onChange={(e) => setEditExpiry(e.target.value)}
              style={{ width: '100%', padding: '0.4rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '0.75rem' }}
            />

            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Notes</label>
            <textarea
              rows={2}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              style={{ width: '100%', padding: '0.4rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '1rem', fontFamily: 'inherit', resize: 'vertical' }}
              placeholder="Optional internal notes…"
            />

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleUpdate} disabled={saving}>
                {saving ? 'Saving…' : '💾 Save Changes'}
              </button>
              <button className="btn-secondary" onClick={() => setEditing(null)} disabled={saving}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

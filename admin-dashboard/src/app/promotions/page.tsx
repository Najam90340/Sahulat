'use client';

import { useState, useEffect, useCallback } from 'react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

type PromotionType = 'percentage' | 'fixed';

interface Promotion {
  id: string;
  code: string;
  description?: string;
  type: PromotionType;
  value: number;
  min_order: number;
  max_discount?: number;
  max_uses?: number;
  uses_count: number;
  valid_from: string;
  valid_to?: string;
  is_active: boolean;
  target_role?: string;
  created_at: string;
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Blank create form – used for initial state and reset
  const EMPTY_FORM = {
    code: '',
    description: '',
    type: 'percentage' as PromotionType,
    value: '',
    min_order: '',
    max_discount: '',
    max_uses: '',
    valid_from: new Date().toISOString().split('T')[0],
    valid_to: '',
    target_role: '',
  };

  // Create form state
  const [form, setForm] = useState(EMPTY_FORM);

  // Edit form state
  const [editForm, setEditForm] = useState({
    description: '',
    value: '',
    min_order: '',
    max_discount: '',
    max_uses: '',
    valid_to: '',
    is_active: true,
  });

  const loadPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/admin/promotions`, { cache: 'no-store' });
      const json = await res.json();
      setPromotions(json.data ?? []);
    } catch {
      setError('Failed to load promotions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPromotions(); }, [loadPromotions]);

  const handleCreate = async () => {
    if (!form.code || !form.value) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/admin/promotions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code.toUpperCase(),
          description: form.description || undefined,
          type: form.type,
          value: Number(form.value),
          min_order: form.min_order ? Number(form.min_order) : 0,
          max_discount: form.max_discount ? Number(form.max_discount) : undefined,
          max_uses: form.max_uses ? Number(form.max_uses) : undefined,
          valid_from: form.valid_from ? new Date(form.valid_from).toISOString() : undefined,
          valid_to: form.valid_to ? new Date(form.valid_to).toISOString() : undefined,
          target_role: form.target_role || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Create failed');
      }
      setSuccess('Promotion created.');
      setShowCreate(false);
      setForm({ ...EMPTY_FORM, valid_from: new Date().toISOString().split('T')[0] });
      await loadPromotions();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError((e as Error).message || 'Failed to create promotion.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (p: Promotion) => {
    setEditing(p);
    setEditForm({
      description: p.description ?? '',
      value: String(p.value),
      min_order: String(p.min_order),
      max_discount: p.max_discount ? String(p.max_discount) : '',
      max_uses: p.max_uses ? String(p.max_uses) : '',
      valid_to: p.valid_to ? p.valid_to.split('T')[0] : '',
      is_active: p.is_active,
    });
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/admin/promotions/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editForm.description || undefined,
          value: editForm.value ? Number(editForm.value) : undefined,
          min_order: editForm.min_order ? Number(editForm.min_order) : undefined,
          max_discount: editForm.max_discount ? Number(editForm.max_discount) : undefined,
          max_uses: editForm.max_uses ? Number(editForm.max_uses) : undefined,
          valid_to: editForm.valid_to ? new Date(editForm.valid_to).toISOString() : undefined,
          is_active: editForm.is_active,
        }),
      });
      if (!res.ok) throw new Error('Update failed');
      setSuccess('Promotion updated.');
      setEditing(null);
      await loadPromotions();
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to update promotion.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    setError('');
    try {
      await fetch(`${BASE_URL}/admin/promotions/${id}`, { method: 'DELETE' });
      setSuccess('Promotion deactivated.');
      await loadPromotions();
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to deactivate promotion.');
    }
  };

  const activeCount = promotions.filter((p) => p.is_active).length;
  const totalUses   = promotions.reduce((acc, p) => acc + p.uses_count, 0);

  const isExpired = (p: Promotion) => p.valid_to && new Date(p.valid_to) < new Date();
  const isUpcoming = (p: Promotion) => new Date(p.valid_from) > new Date();

  const formatVal = (p: Promotion) =>
    p.type === 'percentage' ? `${p.value}% off` : `PKR ${Number(p.value).toLocaleString()} off`;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <h1 className="page-title">🎟️ Promotions</h1>
        <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? '✕ Cancel' : '+ Create Promo'}
        </button>
      </div>
      <p className="page-subtitle">
        Manage discount codes and promotional offers. Control usage limits, expiry dates, and
        target audience.
      </p>

      {success && <div className="alert alert-success">{success}</div>}
      {error   && <div className="alert alert-error">{error}</div>}

      {/* KPIs */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#16a34a' }}>{activeCount}</div>
          <div className="stat-label">Active Promos</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{promotions.length}</div>
          <div className="stat-label">Total Promos</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalUses}</div>
          <div className="stat-label">Total Uses</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{promotions.filter((p) => p.type === 'percentage').length}</div>
          <div className="stat-label">% Discount</div>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 'var(--radius)',
            padding: '1.25rem',
            marginBottom: '1.25rem',
          }}
        >
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>➕ Create Promotion</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {[
              { label: 'Promo Code *', key: 'code', type: 'text', placeholder: 'SAVE20' },
              { label: 'Description',  key: 'description', type: 'text', placeholder: 'Brief description' },
              { label: 'Value *',      key: 'value', type: 'number', placeholder: '10' },
              { label: 'Min Order (PKR)', key: 'min_order', type: 'number', placeholder: '1000' },
              { label: 'Max Discount (PKR)', key: 'max_discount', type: 'number', placeholder: '500' },
              { label: 'Max Uses',     key: 'max_uses', type: 'number', placeholder: '100' },
              { label: 'Valid From',   key: 'valid_from', type: 'date', placeholder: '' },
              { label: 'Valid To',     key: 'valid_to', type: 'date', placeholder: '' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>{label}</label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={form[key as keyof typeof form] as string}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '0.4rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
                />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as PromotionType }))}
                style={{ width: '100%', padding: '0.4rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
              >
                <option value="percentage">% Percentage</option>
                <option value="fixed">PKR Fixed</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Target</label>
              <select
                value={form.target_role}
                onChange={(e) => setForm((f) => ({ ...f, target_role: e.target.value }))}
                style={{ width: '100%', padding: '0.4rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
              >
                <option value="">All users</option>
                <option value="buyer">Buyers only</option>
                <option value="supplier">Suppliers only</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn-primary btn-success"
              onClick={handleCreate}
              disabled={saving || !form.code || !form.value}
            >
              {saving ? 'Saving…' : '✅ Create Promo'}
            </button>
            <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Promos table */}
      {loading ? (
        <div className="loading">Loading promotions…</div>
      ) : promotions.length === 0 ? (
        <div className="empty-state">No promotions yet. Create one!</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Description</th>
                <th>Discount</th>
                <th>Min Order</th>
                <th>Uses</th>
                <th>Valid To</th>
                <th>Target</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map((p) => {
                const expired  = isExpired(p);
                const upcoming = isUpcoming(p);
                const pctUsed  = p.max_uses ? Math.round((p.uses_count / p.max_uses) * 100) : null;

                return (
                  <tr key={p.id}>
                    <td>
                      <code
                        style={{
                          background: '#f3f4f6',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                        }}
                      >
                        {p.code}
                      </code>
                    </td>
                    <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.description ?? '—'}
                    </td>
                    <td style={{ fontWeight: 700 }}>{formatVal(p)}</td>
                    <td>PKR {Number(p.min_order).toLocaleString()}</td>
                    <td>
                      <span title={pctUsed !== null ? `${pctUsed}% of limit used` : undefined}>
                        {p.uses_count}
                        {p.max_uses ? ` / ${p.max_uses}` : ''}
                      </span>
                      {pctUsed !== null && (
                        <div
                          style={{
                            marginTop: 3,
                            height: 4,
                            borderRadius: 99,
                            background: '#e5e7eb',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${pctUsed}%`,
                              height: '100%',
                              background: pctUsed >= 90 ? '#dc2626' : '#2563eb',
                            }}
                          />
                        </div>
                      )}
                    </td>
                    <td style={{ color: expired ? 'var(--danger)' : undefined }}>
                      {p.valid_to ? new Date(p.valid_to).toLocaleDateString() : '∞'}
                    </td>
                    <td>
                      <span className={`badge ${!p.target_role ? 'badge-grey' : 'badge-blue'}`}>
                        {p.target_role ?? 'All'}
                      </span>
                    </td>
                    <td>
                      {!p.is_active ? (
                        <span className="badge badge-grey">⚪ Inactive</span>
                      ) : expired ? (
                        <span className="badge badge-grey">⏰ Expired</span>
                      ) : upcoming ? (
                        <span className="badge badge-orange">📅 Upcoming</span>
                      ) : (
                        <span className="badge badge-green">🟢 Active</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="btn-primary btn-sm" onClick={() => openEdit(p)}>✏️</button>
                        {p.is_active && (
                          <button
                            className="btn-primary btn-sm btn-danger"
                            onClick={() => handleDeactivate(p.id)}
                            title="Deactivate promo"
                          >
                            ✕
                          </button>
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

      {/* Edit modal */}
      {editing && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
          }}
          onClick={(e) => e.target === e.currentTarget && setEditing(null)}
        >
          <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: '1.5rem', width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>✏️ Edit: <code>{editing.code}</code></h3>

            {[
              { label: 'Description', key: 'description', type: 'text' },
              { label: `Value (${editing.type === 'percentage' ? '%' : 'PKR'})`, key: 'value', type: 'number' },
              { label: 'Min Order (PKR)', key: 'min_order', type: 'number' },
              { label: 'Max Discount (PKR)', key: 'max_discount', type: 'number' },
              { label: 'Max Uses', key: 'max_uses', type: 'number' },
              { label: 'Valid To', key: 'valid_to', type: 'date' },
            ].map(({ label, key, type }) => (
              <div key={key} style={{ marginBottom: '0.6rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 3 }}>{label}</label>
                <input
                  type={type}
                  value={editForm[key as keyof typeof editForm] as string}
                  onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '0.4rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
                />
              </div>
            ))}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                id="is_active"
                type="checkbox"
                checked={editForm.is_active}
                onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              <label htmlFor="is_active" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Active</label>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleUpdate} disabled={saving}>
                {saving ? 'Saving…' : '💾 Save Changes'}
              </button>
              <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

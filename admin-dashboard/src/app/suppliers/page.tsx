'use client';

import { useState, useEffect, useCallback } from 'react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

type VerificationStatus = 'pending' | 'verified' | 'premium';

interface Supplier {
  id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  verification_status: VerificationStatus;
  total_quotes: string;
  catalog_items: string;
  created_at: string;
}

const STATUS_BADGE: Record<VerificationStatus, { css: string; label: string; icon: string }> = {
  pending:  { css: 'badge-pending',  label: 'Pending',  icon: '⏳' },
  verified: { css: 'badge-verified', label: 'Verified', icon: '✅' },
  premium:  { css: 'badge-premium',  label: 'Premium',  icon: '⭐' },
};

const NEXT_STATUS: Record<VerificationStatus, VerificationStatus | null> = {
  pending:  'verified',
  verified: 'premium',
  premium:  null,
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/admin/suppliers`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load suppliers');
      const json = await res.json();
      setSuppliers(json.data ?? []);
    } catch {
      setError('Failed to load suppliers. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const handleVerify = async (supplier: Supplier, newStatus: VerificationStatus) => {
    setUpdating(supplier.id);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/admin/suppliers/${supplier.id}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verification_status: newStatus }),
      });
      if (!res.ok) throw new Error('Update failed');
      setSuccessMsg(`${supplier.name} is now ${newStatus}`);
      await loadSuppliers();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError('Failed to update supplier verification status.');
    } finally {
      setUpdating(null);
    }
  };

  const pendingCount = suppliers.filter((s) => s.verification_status === 'pending').length;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <h1 className="page-title">Supplier Verification</h1>
        {pendingCount > 0 && (
          <span className="badge badge-pending">{pendingCount} Pending</span>
        )}
      </div>
      <p className="page-subtitle">
        Review supplier accounts and promote them through the verification workflow:
        Pending → Verified → Premium.
      </p>

      {successMsg && <div className="alert alert-success">{successMsg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Loading suppliers…</div>
      ) : suppliers.length === 0 ? (
        <div className="empty-state">No suppliers registered yet.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>City</th>
                <th>Quotes</th>
                <th>Catalog Items</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => {
                const badge = STATUS_BADGE[supplier.verification_status];
                const nextStatus = NEXT_STATUS[supplier.verification_status];
                const isUpdating = updating === supplier.id;

                return (
                  <tr key={supplier.id}>
                    <td>
                      <strong>{supplier.name}</strong>
                    </td>
                    <td>{supplier.email}</td>
                    <td>{supplier.city ?? '—'}</td>
                    <td>{supplier.total_quotes}</td>
                    <td>{supplier.catalog_items}</td>
                    <td>{new Date(supplier.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${badge.css}`}>
                        {badge.icon} {badge.label}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {nextStatus && (
                          <button
                            className={`btn-primary btn-sm ${nextStatus === 'premium' ? 'btn-warning' : 'btn-success'}`}
                            disabled={isUpdating}
                            onClick={() => handleVerify(supplier, nextStatus)}
                          >
                            {isUpdating
                              ? '…'
                              : nextStatus === 'verified'
                              ? '✅ Verify'
                              : '⭐ Premium'}
                          </button>
                        )}
                        {supplier.verification_status !== 'pending' && (
                          <button
                            className="btn-primary btn-sm btn-danger"
                            disabled={isUpdating}
                            onClick={() => handleVerify(supplier, 'pending')}
                          >
                            {isUpdating ? '…' : '⏳ Reset'}
                          </button>
                        )}
                        {supplier.verification_status === 'premium' && (
                          <button
                            className="btn-primary btn-sm"
                            style={{ background: '#6b7280' }}
                            disabled={isUpdating}
                            onClick={() => handleVerify(supplier, 'verified')}
                          >
                            Downgrade
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
    </>
  );
}

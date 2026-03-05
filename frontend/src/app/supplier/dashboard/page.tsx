import Link from 'next/link';
import { SupplierDashboard, SupplierWithStats } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Demo supplier ID – in a real app this comes from the auth session
const DEMO_SUPPLIER_ID = 'a1000000-0000-0000-0000-000000000005';

const VERIFICATION_BADGE: Record<string, { label: string; css: string; icon: string }> = {
  pending:  { label: 'Pending',  css: 'badge-pending',  icon: '⏳' },
  verified: { label: 'Verified', css: 'badge-green',    icon: '✅' },
  premium:  { label: 'Premium',  css: 'badge-orange',   icon: '⭐' },
};

async function getDashboard(): Promise<SupplierDashboard | null> {
  try {
    const res = await fetch(`${BASE_URL}/suppliers/${DEMO_SUPPLIER_ID}/dashboard`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export default async function SupplierDashboardPage() {
  const dashboard = await getDashboard();

  if (!dashboard) {
    return (
      <main className="page-container">
        <div className="error-state">Failed to load supplier dashboard. Make sure the backend is running.</div>
      </main>
    );
  }

  const { supplier, stats } = dashboard;
  const badge = VERIFICATION_BADGE[supplier.verification_status] ?? VERIFICATION_BADGE.pending;

  return (
    <main className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {supplier.name}
            <span className={`badge ${badge.css}`} style={{ marginLeft: '0.75rem', verticalAlign: 'middle' }}>
              {badge.icon} {badge.label}
            </span>
          </h1>
          <p className="page-subtitle">
            {supplier.email} · {supplier.city ?? 'N/A'}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.open_rfqs}</div>
          <div className="stat-label">Open RFQs / Pools</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.total_quotes}</div>
          <div className="stat-label">Total Quotes Submitted</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.accepted_quotes}</div>
          <div className="stat-label">Accepted Quotes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.catalog_items}</div>
          <div className="stat-label">Active Catalog Items</div>
        </div>
      </div>

      {/* Quick links */}
      <h2 className="section-title">Quick Actions</h2>
      <div className="features">
        <Link href="/supplier/rfqs" className="feature-card" style={{ cursor: 'pointer' }}>
          <div className="feature-icon">📋</div>
          <h2>View RFQs &amp; Pools</h2>
          <p>Browse open buyer requests and submit competitive quotes.</p>
        </Link>
        <Link href="/supplier/catalog" className="feature-card" style={{ cursor: 'pointer' }}>
          <div className="feature-icon">📦</div>
          <h2>Product Catalog</h2>
          <p>Manage your product listings, MOQ rules, and pricing.</p>
        </Link>
        <Link href="/supplier/orders" className="feature-card" style={{ cursor: 'pointer' }}>
          <div className="feature-icon">🚚</div>
          <h2>Orders &amp; Analytics</h2>
          <p>Track confirmed orders and view revenue analytics.</p>
        </Link>
      </div>

      {/* Verification status info */}
      {supplier.verification_status === 'pending' && (
        <div className="alert alert-error" style={{ marginTop: '2rem' }}>
          ⏳ Your account is pending verification. An admin will review and verify your supplier
          profile shortly. Verified suppliers receive a badge and priority placement.
        </div>
      )}
      {supplier.verification_status === 'verified' && (
        <div className="alert alert-success" style={{ marginTop: '2rem' }}>
          ✅ Your account is verified. Upgrade to <strong>Premium</strong> for priority placement
          and advanced analytics.
        </div>
      )}
      {supplier.verification_status === 'premium' && (
        <div className="alert alert-success" style={{ marginTop: '2rem' }}>
          ⭐ You are a Premium supplier! You enjoy priority placement and advanced analytics.
        </div>
      )}
    </main>
  );
}

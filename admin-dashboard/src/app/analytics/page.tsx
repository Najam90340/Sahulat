const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function getAnalytics() {
  try {
    const res = await fetch(`${BASE_URL}/admin/analytics`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export default async function AnalyticsPage() {
  const analytics = await getAnalytics();

  if (!analytics) {
    return (
      <>
        <h1 className="page-title">Platform Analytics</h1>
        <div className="alert alert-error">
          Could not load analytics. Make sure the backend is running on <code>{BASE_URL}</code>.
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="page-title">Platform Analytics</h1>
      <p className="page-subtitle">Detailed breakdown of platform activity and supplier metrics.</p>

      <h2 className="section-title">RFQ Funnel</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{analytics.rfqs.total_rfqs}</div>
          <div className="stat-label">Total RFQs</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{analytics.rfqs.open_rfqs}</div>
          <div className="stat-label">Open</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{analytics.rfqs.pooled_rfqs}</div>
          <div className="stat-label">Pooled</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{analytics.rfqs.confirmed_rfqs}</div>
          <div className="stat-label">Confirmed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{analytics.rfqs.cancelled_rfqs}</div>
          <div className="stat-label">Cancelled</div>
        </div>
      </div>

      <h2 className="section-title">Pool Activity</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{analytics.pools.total_pools}</div>
          <div className="stat-label">Total Pools</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{analytics.pools.open_pools}</div>
          <div className="stat-label">Open</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{analytics.pools.confirmed_pools}</div>
          <div className="stat-label">Confirmed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{analytics.pools.total_quantity_pooled ?? 0}</div>
          <div className="stat-label">Total Units Pooled</div>
        </div>
      </div>

      <h2 className="section-title">Supplier Ecosystem</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{analytics.suppliers.total_suppliers}</div>
          <div className="stat-label">Total Suppliers</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{analytics.suppliers.pending_verification}</div>
          <div className="stat-label">⏳ Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{analytics.suppliers.verified_suppliers}</div>
          <div className="stat-label">✅ Verified</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{analytics.suppliers.premium_suppliers}</div>
          <div className="stat-label">⭐ Premium</div>
        </div>
      </div>

      <h2 className="section-title">Quote Performance</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{analytics.quotes.total_quotes}</div>
          <div className="stat-label">Total Quotes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{analytics.quotes.accepted_quotes}</div>
          <div className="stat-label">Accepted</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{analytics.quotes.pending_quotes}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{analytics.quotes.rejected_quotes}</div>
          <div className="stat-label">Rejected</div>
        </div>
      </div>
    </>
  );
}

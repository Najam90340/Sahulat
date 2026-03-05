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

const fmt = (n: number | string) =>
  `PKR ${Number(n).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const pct = (a: number | string, b: number | string): string => {
  const an = Number(a), bn = Number(b);
  if (!bn) return '—';
  return `${((an / bn) * 100).toFixed(1)}%`;
};

export default async function AnalyticsPage() {
  const analytics = await getAnalytics();

  if (!analytics) {
    return (
      <>
        <h1 className="page-title">📊 Platform Analytics</h1>
        <div className="alert alert-error">
          Could not load analytics. Make sure the backend is running on <code>{BASE_URL}</code>.
        </div>
      </>
    );
  }

  const { rfqs, pools, suppliers, quotes, financial, users } = analytics;

  // Pre-computed derived values
  const totalProcessed =
    Number(financial?.gmv_released ?? 0) + Number(financial?.escrow_held ?? 0);

  return (
    <>
      <h1 className="page-title">📊 Platform Analytics</h1>
      <p className="page-subtitle">
        End-to-end platform metrics: GMV, active users, pool success rate, and more.
      </p>

      {/* ── Top KPIs ── */}
      <h2 className="section-title">Key Performance Indicators</h2>
      <div className="stats-grid">
        <div className="stat-card" style={{ gridColumn: 'span 2' }}>
          <div className="stat-value" style={{ fontSize: '2.2rem', color: '#16a34a' }}>
            {fmt(financial?.gmv_released ?? 0)}
          </div>
          <div className="stat-label">💰 Gross Merchandise Value (GMV Released)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#d97706' }}>
            {fmt(financial?.escrow_held ?? 0)}
          </div>
          <div className="stat-label">🔒 Escrow Held</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#9ca3af' }}>
            {fmt(financial?.total_refunded ?? 0)}
          </div>
          <div className="stat-label">↩️ Total Refunded</div>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-value">{users?.total_users ?? '—'}</div>
          <div className="stat-label">👥 Total Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#2563eb' }}>{users?.new_users_30d ?? '—'}</div>
          <div className="stat-label">🆕 New Users (30d)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#16a34a' }}>
            {pools?.pool_success_rate ?? '—'}%
          </div>
          <div className="stat-label">🏊 Pool Success Rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{financial?.total_transactions ?? '—'}</div>
          <div className="stat-label">💳 Total Transactions</div>
        </div>
      </div>

      {/* ── Users ── */}
      <h2 className="section-title">Users</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{users?.total_buyers ?? '—'}</div>
          <div className="stat-label">👤 Buyers</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{users?.total_suppliers_all ?? '—'}</div>
          <div className="stat-label">🏭 Suppliers</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{users?.new_users_30d ?? '—'}</div>
          <div className="stat-label">🆕 Joined Last 30d</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#d97706' }}>{suppliers?.pending_verification ?? '—'}</div>
          <div className="stat-label">⏳ Pending Verification</div>
        </div>
      </div>

      {/* ── RFQ Funnel ── */}
      <h2 className="section-title">RFQ Funnel</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{rfqs?.total_rfqs}</div>
          <div className="stat-label">Total RFQs</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{rfqs?.open_rfqs}</div>
          <div className="stat-label">📬 Open</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{rfqs?.pooled_rfqs}</div>
          <div className="stat-label">🏊 Pooled</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{rfqs?.confirmed_rfqs}</div>
          <div className="stat-label">✅ Confirmed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{rfqs?.cancelled_rfqs}</div>
          <div className="stat-label">❌ Cancelled</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#16a34a' }}>
            {pct(rfqs?.confirmed_rfqs, rfqs?.total_rfqs)}
          </div>
          <div className="stat-label">Conversion Rate</div>
        </div>
      </div>

      {/* ── Pool Activity ── */}
      <h2 className="section-title">Pool Activity</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{pools?.total_pools}</div>
          <div className="stat-label">Total Pools</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{pools?.open_pools}</div>
          <div className="stat-label">📬 Open</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{pools?.confirmed_pools}</div>
          <div className="stat-label">✅ Confirmed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{pools?.refunded_pools ?? 0}</div>
          <div className="stat-label">↩️ Refunded</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#16a34a' }}>
            {pools?.pool_success_rate ?? '—'}%
          </div>
          <div className="stat-label">🏊 Success Rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Number(pools?.total_quantity_pooled ?? 0).toLocaleString()}</div>
          <div className="stat-label">📦 Units Pooled</div>
        </div>
      </div>

      {/* ── Suppliers ── */}
      <h2 className="section-title">Supplier Ecosystem</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{suppliers?.total_suppliers}</div>
          <div className="stat-label">Total Suppliers</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#d97706' }}>{suppliers?.pending_verification}</div>
          <div className="stat-label">⏳ Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#16a34a' }}>{suppliers?.verified_suppliers}</div>
          <div className="stat-label">✅ Verified</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#9a3412' }}>{suppliers?.premium_suppliers}</div>
          <div className="stat-label">⭐ Premium</div>
        </div>
      </div>

      {/* ── Quotes ── */}
      <h2 className="section-title">Quote Performance</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{quotes?.total_quotes}</div>
          <div className="stat-label">Total Quotes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#16a34a' }}>{quotes?.accepted_quotes}</div>
          <div className="stat-label">✅ Accepted</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{quotes?.pending_quotes}</div>
          <div className="stat-label">⏳ Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{quotes?.rejected_quotes}</div>
          <div className="stat-label">❌ Rejected</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#16a34a' }}>
            {pct(quotes?.accepted_quotes, quotes?.total_quotes)}
          </div>
          <div className="stat-label">Quote Accept Rate</div>
        </div>
      </div>

      {/* ── Financials ── */}
      <h2 className="section-title">Financial Summary</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#16a34a' }}>{fmt(financial?.gmv_released ?? 0)}</div>
          <div className="stat-label">💰 GMV (Released)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#d97706' }}>{fmt(financial?.escrow_held ?? 0)}</div>
          <div className="stat-label">🔒 In Escrow</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{fmt(financial?.total_refunded ?? 0)}</div>
          <div className="stat-label">↩️ Refunded</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{financial?.txns_held ?? '—'}</div>
          <div className="stat-label">Transactions Held</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{financial?.txns_released ?? '—'}</div>
          <div className="stat-label">Transactions Released</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {pct(financial?.gmv_released, totalProcessed)}
          </div>
          <div className="stat-label">Release Rate</div>
        </div>
      </div>
    </>
  );
}

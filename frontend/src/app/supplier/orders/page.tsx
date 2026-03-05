import Link from 'next/link';
import { SupplierOrder, Quote } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Demo supplier ID – in a real app this comes from the auth session
const DEMO_SUPPLIER_ID = 'a1000000-0000-0000-0000-000000000005';

const POOL_STATUS_BADGE: Record<string, string> = {
  open:      'badge-blue',
  confirmed: 'badge-green',
  refunded:  'badge-grey',
  partial:   'badge-orange',
};

const QUOTE_STATUS_BADGE: Record<string, string> = {
  pending:  'badge-pending',
  accepted: 'badge-green',
  rejected: 'badge-grey',
};

async function getOrders(): Promise<SupplierOrder[]> {
  try {
    const res = await fetch(`${BASE_URL}/suppliers/${DEMO_SUPPLIER_ID}/orders`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

async function getQuotes(): Promise<Quote[]> {
  try {
    const res = await fetch(`${BASE_URL}/suppliers/${DEMO_SUPPLIER_ID}/quotes`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

async function getAnalytics() {
  try {
    const res = await fetch(`${BASE_URL}/suppliers/${DEMO_SUPPLIER_ID}/analytics`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export default async function SupplierOrdersPage() {
  const [orders, quotes, analytics] = await Promise.all([
    getOrders(),
    getQuotes(),
    getAnalytics(),
  ]);

  const totalRevenue = analytics?.orders?.confirmed_revenue
    ? Number(analytics.orders.confirmed_revenue)
    : 0;

  return (
    <main className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Orders &amp; Analytics</h1>
          <p className="page-subtitle">Track your confirmed orders and view performance metrics.</p>
        </div>
        <Link href="/supplier/dashboard" className="btn-secondary">← Dashboard</Link>
      </div>

      {/* Analytics placeholders */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">
            {analytics?.orders?.total_orders ?? 0}
          </div>
          <div className="stat-label">Total Orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {analytics?.orders?.confirmed_orders ?? 0}
          </div>
          <div className="stat-label">Confirmed Orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            PKR {totalRevenue > 0 ? totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
          </div>
          <div className="stat-label">Confirmed Revenue</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {analytics?.quotes?.won_quotes ?? 0} / {analytics?.quotes?.total_quotes ?? 0}
          </div>
          <div className="stat-label">Quotes Won</div>
        </div>
      </div>

      {/* Top Products placeholder */}
      {analytics?.top_products && analytics.top_products.length > 0 && (
        <>
          <h2 className="section-title">Top Products by Revenue</h2>
          <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
            <table className="members-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Orders</th>
                  <th>Revenue (PKR)</th>
                </tr>
              </thead>
              <tbody>
                {analytics.top_products.map(
                  (p: { product_name: string; order_count: number; revenue: number }, i: number) => (
                    <tr key={i}>
                      <td>{p.product_name}</td>
                      <td>{p.order_count}</td>
                      <td>
                        {p.revenue
                          ? Number(p.revenue).toLocaleString(undefined, { maximumFractionDigits: 0 })
                          : '—'}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Active Orders */}
      <h2 className="section-title">Active Orders</h2>
      {orders.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: '1rem' }}>
          <p>No accepted orders yet. Submit quotes on RFQs to win orders.</p>
          <Link href="/supplier/rfqs" className="btn-primary">Browse RFQs</Link>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
          <table className="members-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>City</th>
                <th>Quantity</th>
                <th>Price/Unit</th>
                <th>Est. Revenue</th>
                <th>Lead Time</th>
                <th>Pool Status</th>
                <th>Quote Status</th>
                <th>Deadline</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.pool_id}>
                  <td><strong>{order.product_name}</strong></td>
                  <td>{order.city}</td>
                  <td>{order.current_quantity.toLocaleString()}</td>
                  <td>PKR {Number(order.price_per_unit).toLocaleString()}</td>
                  <td>
                    PKR{' '}
                    {order.estimated_revenue
                      ? Number(order.estimated_revenue).toLocaleString(undefined, { maximumFractionDigits: 0 })
                      : '—'}
                  </td>
                  <td>{order.lead_time_days}d</td>
                  <td>
                    <span className={`badge ${POOL_STATUS_BADGE[order.pool_status] ?? 'badge-grey'}`}>
                      {order.pool_status}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${QUOTE_STATUS_BADGE[order.quote_status] ?? 'badge-grey'}`}>
                      {order.quote_status}
                    </span>
                  </td>
                  <td>
                    {order.deadline
                      ? new Date(order.deadline).toLocaleDateString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* All Quotes */}
      <h2 className="section-title">All Submitted Quotes</h2>
      {quotes.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: '1rem' }}>
          <p>You have not submitted any quotes yet.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="members-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>City</th>
                <th>Price/Unit</th>
                <th>Lead Time</th>
                <th>Notes</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr key={quote.id}>
                  <td>{quote.product_name ?? '—'}</td>
                  <td>{quote.quantity?.toLocaleString() ?? '—'}</td>
                  <td>{quote.city ?? '—'}</td>
                  <td>PKR {Number(quote.price_per_unit).toLocaleString()}</td>
                  <td>{quote.lead_time_days}d</td>
                  <td style={{ maxWidth: 200, fontSize: '0.85rem' }}>{quote.notes ?? '—'}</td>
                  <td>
                    <span className={`badge ${QUOTE_STATUS_BADGE[quote.status] ?? 'badge-grey'}`}>
                      {quote.status}
                    </span>
                  </td>
                  <td>{new Date(quote.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

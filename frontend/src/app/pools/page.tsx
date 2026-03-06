import Link from 'next/link';
import { Pool } from '@/types';
import ProgressBar from '@/components/ProgressBar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const STATUS_BADGE: Record<string, string> = {
  open: 'badge-blue',
  confirmed: 'badge-green',
  refunded: 'badge-grey',
  partial: 'badge-orange',
};

async function getPools(): Promise<Pool[]> {
  try {
    const res = await fetch(`${BASE_URL}/pools`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export default async function PoolsListPage() {
  const pools = await getPools();
  const openPools = pools.filter((p) => p.status === 'open');
  const otherPools = pools.filter((p) => p.status !== 'open');

  return (
    <main className="page-container">
      <div className="page-header">
        <h1 className="page-title">Buying Pools</h1>
        <Link href="/rfq/new" className="btn-primary">
          + Post RFQ / Create Pool
        </Link>
      </div>
      <p className="page-subtitle">
        Join an existing pool to reach the supplier&apos;s Minimum Order Quantity together.
      </p>

      {pools.length === 0 ? (
        <div className="empty-state">
          <p>No pools available yet.</p>
          <Link href="/rfq/new" className="btn-primary">
            Create the first pool
          </Link>
        </div>
      ) : (
        <>
          {openPools.length > 0 && (
            <>
              <h2 className="section-title">Open Pools</h2>
              <div className="card-grid">
                {openPools.map((pool) => (
                  <Link href={`/pools/${pool.id}`} key={pool.id} className="pool-card">
                    <div className="pool-card-header">
                      <h3>{pool.product_name}</h3>
                      <span className={`badge ${STATUS_BADGE[pool.status]}`}>{pool.status}</span>
                    </div>
                    <p className="pool-city">📍 {pool.city}</p>
                    <ProgressBar current={pool.current_quantity} target={pool.moq} />
                    <div className="pool-meta">
                      <span>👥 {pool.member_count} member{pool.member_count !== 1 ? 's' : ''}</span>
                      {pool.deadline && (
                        <span>
                          ⏰ Closes {new Date(pool.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}

          {otherPools.length > 0 && (
            <>
              <h2 className="section-title">Past Pools</h2>
              <div className="card-grid">
                {otherPools.map((pool) => (
                  <Link href={`/pools/${pool.id}`} key={pool.id} className="pool-card pool-card--closed">
                    <div className="pool-card-header">
                      <h3>{pool.product_name}</h3>
                      <span className={`badge ${STATUS_BADGE[pool.status]}`}>{pool.status}</span>
                    </div>
                    <p className="pool-city">📍 {pool.city}</p>
                    <ProgressBar current={pool.current_quantity} target={pool.moq} />
                    <div className="pool-meta">
                      <span>👥 {pool.member_count} members</span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}

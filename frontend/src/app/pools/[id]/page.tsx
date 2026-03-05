'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Pool, PoolMember } from '@/types';
import ProgressBar from '@/components/ProgressBar';
import { getPool, joinPool } from '@/lib/api';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Demo buyer — in production this would come from an auth context
const DEMO_BUYER_ID = 'a1000000-0000-0000-0000-000000000003';
const DEMO_BUYER_NAME = 'Usman Malik';

interface ProgressEvent {
  current_quantity: number;
  moq: number;
  status: string;
  progress_pct: number;
}

export default function PoolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [poolId, setPoolId] = useState<string | null>(null);
  const [pool, setPool] = useState<Pool | null>(null);
  const [loadingPool, setLoadingPool] = useState(true);
  const [joinQty, setJoinQty] = useState(1);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');
  const [liveProgress, setLiveProgress] = useState<ProgressEvent | null>(null);

  // Resolve params promise
  useEffect(() => {
    params.then((p) => setPoolId(p.id));
  }, [params]);

  const fetchPool = useCallback(async (id: string) => {
    try {
      const data = await getPool(id);
      setPool(data);
    } catch {
      setPool(null);
    } finally {
      setLoadingPool(false);
    }
  }, []);

  useEffect(() => {
    if (!poolId) return;
    fetchPool(poolId);
  }, [poolId, fetchPool]);

  // SSE real-time progress
  useEffect(() => {
    if (!poolId) return;
    const evtSource = new EventSource(`${BASE_URL}/pools/${poolId}/progress`);
    evtSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ProgressEvent;
        setLiveProgress(data);
      } catch {
        // ignore parse errors
      }
    };
    return () => evtSource.close();
  }, [poolId]);

  const handleJoin = async () => {
    if (!poolId) return;
    setJoining(true);
    setJoinError('');
    setJoinSuccess('');
    try {
      const result = await joinPool(poolId, {
        buyer_id: DEMO_BUYER_ID,
        quantity: joinQty,
      });
      if (result.auto_confirmed) {
        setJoinSuccess('🎉 Pool confirmed! MOQ reached. Your order is confirmed.');
      } else {
        setJoinSuccess(`✅ Joined successfully! Waiting for more buyers to reach MOQ.`);
      }
      setPool(result.pool);
      setLiveProgress({
        current_quantity: result.pool.current_quantity,
        moq: result.pool.moq,
        status: result.pool.status,
        progress_pct: result.pool.progress_pct,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to join pool.';
      setJoinError(msg);
    } finally {
      setJoining(false);
    }
  };

  if (loadingPool) {
    return (
      <main className="page-container">
        <div className="loading">Loading pool…</div>
      </main>
    );
  }

  if (!pool) {
    return (
      <main className="page-container">
        <div className="error-state">Pool not found.</div>
        <Link href="/pools" className="back-link">← All Pools</Link>
      </main>
    );
  }

  const displayQty = liveProgress?.current_quantity ?? pool.current_quantity;
  const displayMoq = liveProgress?.moq ?? pool.moq;
  const displayStatus = liveProgress?.status ?? pool.status;

  const isOpen = displayStatus === 'open';
  const alreadyMember = pool.members?.some((m: PoolMember) => m.buyer_id === DEMO_BUYER_ID);

  return (
    <main className="page-container">
      <Link href="/pools" className="back-link">← All Pools</Link>

      <div className="detail-card">
        <div className="detail-header">
          <h1>{pool.product_name}</h1>
          <span className={`badge badge-${displayStatus}`}>{displayStatus}</span>
        </div>

        <p className="pool-city-detail">📍 {pool.city}</p>

        {/* Real-time progress bar */}
        <div className="progress-section">
          <h2>Pool Progress</h2>
          <ProgressBar current={displayQty} target={displayMoq} />
          {liveProgress && (
            <p className="live-indicator">🟢 Live</p>
          )}
          {displayQty >= displayMoq && (
            <p className="moq-met">✅ MOQ reached! Supplier order will be confirmed.</p>
          )}
        </div>

        <dl className="detail-grid">
          <dt>MOQ (Target)</dt>
          <dd>{displayMoq.toLocaleString()} units</dd>
          <dt>Current Qty</dt>
          <dd>{displayQty.toLocaleString()} units</dd>
          <dt>Members</dt>
          <dd>{pool.member_count}</dd>
          {pool.deadline && (
            <>
              <dt>Deadline</dt>
              <dd>{new Date(pool.deadline).toLocaleString()}</dd>
            </>
          )}
        </dl>

        {/* Members list */}
        {pool.members && pool.members.length > 0 && (
          <div className="members-section">
            <h2>Members</h2>
            <table className="members-table">
              <thead>
                <tr>
                  <th>Buyer</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {pool.members.map((m: PoolMember) => (
                  <tr key={m.id} className={m.buyer_id === DEMO_BUYER_ID ? 'row-you' : ''}>
                    <td>
                      {m.buyer_name ?? m.buyer_id}
                      {m.buyer_id === DEMO_BUYER_ID && (
                        <span className="you-badge"> (you)</span>
                      )}
                    </td>
                    <td>{m.quantity.toLocaleString()}</td>
                    <td>
                      <span className={`badge badge-${m.status}`}>{m.status}</span>
                    </td>
                    <td>{new Date(m.joined_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Join section */}
        {isOpen && (
          <div className="join-section">
            <h2>{alreadyMember ? 'Update your quantity' : 'Join this Pool'}</h2>
            <p className="join-info">
              {DEMO_BUYER_NAME}, enter how many units you want to commit.
            </p>
            {joinError && <div className="alert alert-error">{joinError}</div>}
            {joinSuccess && <div className="alert alert-success">{joinSuccess}</div>}
            <div className="join-form">
              <label htmlFor="join-qty">Your Quantity (units)</label>
              <input
                id="join-qty"
                type="number"
                min={1}
                max={displayMoq}
                value={joinQty}
                onChange={(e) => setJoinQty(Number(e.target.value))}
              />
              <button
                className="btn-primary"
                onClick={handleJoin}
                disabled={joining || joinQty < 1}
              >
                {joining ? 'Joining…' : alreadyMember ? 'Update' : 'Join Pool'}
              </button>
            </div>
          </div>
        )}

        {!isOpen && (
          <div className={`status-banner status-${displayStatus}`}>
            {displayStatus === 'confirmed' && '🎉 This pool is confirmed! Orders are being processed.'}
            {displayStatus === 'refunded' && '💸 Pool closed without meeting MOQ. Refunds have been issued.'}
            {displayStatus === 'partial' && '⚠️ Partial fulfillment — not all orders could be confirmed.'}
          </div>
        )}

        {/* Pay Now button for confirmed pools where buyer is a member */}
        {displayStatus === 'confirmed' && alreadyMember && (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 'var(--radius)',
              padding: '1.25rem',
            }}
          >
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              💳 Secure Your Order
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              This pool has been confirmed. Pay now to secure your allocation. Your payment will be
              held in escrow and released to the supplier only after you confirm delivery.
            </p>
            <Link href={`/payment/${pool.id}`} className="btn-primary">
              Pay Now →
            </Link>
            <Link
              href="/payment/history"
              className="btn-secondary"
              style={{ marginLeft: '0.75rem' }}
            >
              View My Payments
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

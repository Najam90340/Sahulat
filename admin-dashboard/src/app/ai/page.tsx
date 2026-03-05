'use client';

import { useState, useEffect, useCallback } from 'react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ── Types ──────────────────────────────────────────────────────────────────────

interface AiStatus {
  model_version: string;
  status: string;
  capabilities: AiCapability[];
  upgrade_notes: {
    current_approach: string;
    next_milestone: string;
    feature_flag: string;
  };
}

interface AiCapability {
  name: string;
  endpoint: string;
  description: string;
  records_computed: number;
  avg_score?: number;
  avg_confidence?: number;
}

interface SupplierMatch {
  supplier_id: string;
  supplier_name?: string;
  supplier_city?: string;
  verification_status?: string;
  score: number;
  location_score: number;
  performance_score: number;
  catalog_score: number;
  price_score: number;
  rank: number;
  reasoning: Record<string, string>;
}

interface CreditScore {
  buyer_id: string;
  buyer_name?: string;
  buyer_email?: string;
  score: number;
  grade: string;
  creditworthiness: string;
  suggested_limit: number;
  factors: Array<{ label: string; impact: string; detail: string }>;
  on_time_rate: number;
  transaction_count: number;
  model_version: string;
}

interface PricingInsight {
  id?: string;
  supplier_id: string;
  supplier_name?: string;
  product_name: string;
  category?: string;
  suggested_min: number;
  suggested_max: number;
  suggested_optimal: number;
  market_median?: number;
  competitor_count: number;
  confidence: number;
  reasoning: Record<string, string>;
  model_version: string;
}

// ── Colour helpers ─────────────────────────────────────────────────────────────

const GRADE_COLOUR: Record<string, string> = {
  A: '#16a34a', B: '#2563eb', C: '#d97706', D: '#dc2626', F: '#6b7280',
};

const GRADE_BADGE: Record<string, string> = {
  A: 'badge-green', B: 'badge-blue', C: 'badge-orange', D: 'badge-pending', F: 'badge-grey',
};

const IMPACT_ICON: Record<string, string> = {
  positive: '✅', negative: '❌', neutral: '➖',
};

const VER_BADGE: Record<string, string> = {
  premium: 'badge-premium', verified: 'badge-verified', pending: 'badge-pending',
};

function scoreBar(score: number, max = 100, color = '#2563eb') {
  return (
    <div style={{ height: 6, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden', marginTop: 4 }}>
      <div style={{ width: `${(score / max) * 100}%`, height: '100%', background: color }} />
    </div>
  );
}

const fmt = (n: number | string) =>
  `PKR ${Number(n).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;

// ── Tab definition ─────────────────────────────────────────────────────────────

type Tab = 'overview' | 'supplier-match' | 'credit-scores' | 'pricing';

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AiServicesPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [aiStatus, setAiStatus]           = useState<AiStatus | null>(null);
  const [creditScores, setCreditScores]   = useState<CreditScore[]>([]);
  const [pricingInsights, setPricingInsights] = useState<PricingInsight[]>([]);
  const [matchResults, setMatchResults]   = useState<SupplierMatch[]>([]);
  const [rfqId, setRfqId]                 = useState('');
  const [running, setRunning]             = useState(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [success, setSuccess]             = useState('');

  // ── Loaders ──────────────────────────────────────────────────────────────────

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/ai/status`, { cache: 'no-store' });
      const json = await res.json();
      setAiStatus(json.data ?? null);
    } catch { /* backend not running */ }
  }, []);

  const loadCreditScores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/ai/credit-scores`, { cache: 'no-store' });
      const json = await res.json();
      setCreditScores(json.data ?? []);
    } catch {
      setError('Failed to load credit scores.');
    } finally { setLoading(false); }
  }, []);

  const loadPricing = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/ai/pricing-insights`, { cache: 'no-store' });
      const json = await res.json();
      setPricingInsights(json.data ?? []);
    } catch {
      setError('Failed to load pricing insights.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadStatus();
    if (tab === 'credit-scores') loadCreditScores();
    if (tab === 'pricing')        loadPricing();
  }, [tab, loadStatus, loadCreditScores, loadPricing]);

  // ── Actions ───────────────────────────────────────────────────────────────────

  const runMatch = async () => {
    if (!rfqId.trim()) return;
    setRunning(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/ai/supplier-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfq_id: rfqId.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? 'Failed');
      setMatchResults(json.data ?? []);
      setSuccess(`Ranked ${json.data.length} supplier(s) for RFQ.`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) {
      setError((e as Error).message);
    } finally { setRunning(false); }
  };

  const recomputeCredit = async (buyerId: string, name: string) => {
    setRunning(true);
    setError('');
    try {
      await fetch(`${BASE_URL}/ai/credit-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyer_id: buyerId }),
      });
      setSuccess(`Credit score recomputed for ${name}.`);
      await loadCreditScores();
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to recompute credit score.');
    } finally { setRunning(false); }
  };

  // ── Sidebar tabs ──────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview',       label: 'Overview',        icon: '📊' },
    { id: 'supplier-match', label: 'Supplier Match',  icon: '🎯' },
    { id: 'credit-scores',  label: 'Credit Scores',   icon: '💳' },
    { id: 'pricing',        label: 'Pricing Insights',icon: '💡' },
  ];

  return (
    <>
      <h1 className="page-title">🤖 AI Services</h1>
      <p className="page-subtitle">
        Placeholder v1 — Deterministic heuristic models. Upgradeable to ML microservices
        without API or schema changes.
      </p>

      {success && <div className="alert alert-success">{success}</div>}
      {error   && <div className="alert alert-error">{error}</div>}

      {/* Sub-nav tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setError(''); }}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: 'var(--radius) var(--radius) 0 0',
              border: 'none',
              background: tab === t.id ? 'var(--primary)' : 'var(--surface)',
              color: tab === t.id ? '#fff' : 'var(--text)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.88rem',
              borderBottom: tab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Overview ── */}
      {tab === 'overview' && (
        <>
          {/* Status badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <span style={{
              background: '#dcfce7', color: '#166534', padding: '0.3rem 0.9rem',
              borderRadius: 999, fontWeight: 700, fontSize: '0.85rem',
            }}>
              🟢 {aiStatus?.status ?? 'Checking…'}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Model: <strong>{aiStatus?.model_version ?? '—'}</strong>
            </span>
          </div>

          {/* Capability cards */}
          {aiStatus?.capabilities.map((cap) => (
            <div
              key={cap.name}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '1.25rem',
                marginBottom: '1rem',
                boxShadow: 'var(--shadow)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <h3 style={{ fontWeight: 700, fontSize: '1.05rem' }}>{cap.name}</h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {cap.records_computed} records computed
                </span>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                {cap.description}
              </p>
              <code style={{ fontSize: '0.8rem', background: '#f3f4f6', padding: '2px 8px', borderRadius: 4 }}>
                {cap.endpoint}
              </code>
              {cap.avg_score !== null && cap.avg_score !== undefined && (
                <span style={{ marginLeft: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Avg score: <strong>{cap.avg_score}</strong>
                </span>
              )}
              {cap.avg_confidence !== null && cap.avg_confidence !== undefined && (
                <span style={{ marginLeft: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Avg confidence: <strong>{cap.avg_confidence}%</strong>
                </span>
              )}
            </div>
          ))}

          {/* Architecture / upgrade path */}
          {aiStatus?.upgrade_notes && (
            <div style={{
              background: '#eff6ff', border: '1px solid #bfdbfe',
              borderRadius: 'var(--radius)', padding: '1.25rem', marginTop: '1rem',
            }}>
              <h3 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>🔭 Upgrade Path</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '0.35rem 0', fontWeight: 600, width: 180 }}>Current approach</td>
                    <td>{aiStatus.upgrade_notes.current_approach}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.35rem 0', fontWeight: 600 }}>Next milestone</td>
                    <td>{aiStatus.upgrade_notes.next_milestone}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.35rem 0', fontWeight: 600 }}>Feature flag</td>
                    <td><code style={{ background: '#dbeafe', padding: '1px 6px', borderRadius: 4 }}>{aiStatus.upgrade_notes.feature_flag}</code></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {!aiStatus && (
            <div className="alert alert-error">
              Cannot reach backend at <code>{BASE_URL}</code>. Start the backend server to see live AI data.
            </div>
          )}
        </>
      )}

      {/* ── Tab: Supplier Match ── */}
      {tab === 'supplier-match' && (
        <>
          <h2 className="section-title">🎯 Supplier Matching</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Ranks all suppliers against a specific RFQ using location, performance, catalog, and
            price signals. Enter an RFQ UUID below to run the matching engine.
          </p>

          {/* RFQ input */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>
                RFQ ID (UUID)
              </label>
              <input
                type="text"
                value={rfqId}
                onChange={(e) => setRfqId(e.target.value)}
                placeholder="c1000000-0000-0000-0000-000000000001"
                style={{
                  width: '100%', padding: '0.45rem 0.75rem',
                  borderRadius: 'var(--radius)', border: '1px solid var(--border)',
                  fontFamily: 'monospace', fontSize: '0.88rem',
                }}
              />
            </div>
            <button
              className="btn-primary"
              onClick={runMatch}
              disabled={running || !rfqId.trim()}
              style={{ minWidth: 140 }}
            >
              {running ? '⏳ Scoring…' : '🚀 Run Match'}
            </button>
          </div>

          {/* Quick-fill demo button */}
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Demo:{' '}
            <button
              onClick={() => setRfqId('c1000000-0000-0000-0000-000000000001')}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.82rem' }}
            >
              Basmati Rice RFQ (Lahore)
            </button>
          </p>

          {/* Scoring weights legend */}
          <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.83rem', color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text)' }}>Scoring weights:</strong>{' '}
            Location 35% · Performance 25% · Catalog 25% · Price 15%
          </div>

          {matchResults.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Supplier</th>
                    <th>City</th>
                    <th>Status</th>
                    <th style={{ minWidth: 120 }}>Score</th>
                    <th>Location</th>
                    <th>Performance</th>
                    <th>Catalog</th>
                    <th>Price</th>
                    <th>Reasoning</th>
                  </tr>
                </thead>
                <tbody>
                  {matchResults.map((m) => (
                    <tr key={m.supplier_id}>
                      <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.1rem', color: m.rank === 1 ? '#d97706' : m.rank === 2 ? '#6b7280' : 'var(--text)' }}>
                        <span aria-label={`Rank ${m.rank}`}>
                          {m.rank === 1 ? '🥇' : m.rank === 2 ? '🥈' : m.rank === 3 ? '🥉' : `#${m.rank}`}
                        </span>
                      </td>
                      <td><strong>{m.supplier_name ?? m.supplier_id}</strong></td>
                      <td>{m.supplier_city ?? '—'}</td>
                      <td>
                        <span className={`badge ${VER_BADGE[m.verification_status ?? 'pending'] ?? 'badge-grey'}`}>
                          {m.verification_status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)' }}>
                            {Number(m.score).toFixed(1)}
                          </span>
                          {scoreBar(m.score, 100, '#2563eb')}
                        </div>
                      </td>
                      {(['location_score','performance_score','catalog_score','price_score'] as const).map((k) => (
                        <td key={k}>
                          <span style={{ fontSize: '0.88rem' }}>{Number(m[k]).toFixed(0)}</span>
                          {scoreBar(m[k], 100, '#60a5fa')}
                        </td>
                      ))}
                      <td style={{ maxWidth: 220 }}>
                        <details>
                          <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: 'var(--primary)' }}>
                            View reasoning
                          </summary>
                          <ul style={{ marginTop: '0.5rem', paddingLeft: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {Object.entries(m.reasoning ?? {}).map(([k, v]) => (
                              <li key={k} style={{ marginBottom: '0.25rem' }}><strong>{k}:</strong> {v}</li>
                            ))}
                          </ul>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {matchResults.length === 0 && !running && (
            <div className="empty-state">Enter an RFQ ID and click Run Match to see ranked suppliers.</div>
          )}
        </>
      )}

      {/* ── Tab: Credit Scores ── */}
      {tab === 'credit-scores' && (
        <>
          <h2 className="section-title">💳 Buyer Credit Scores</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            FICO-style scores (300–850) computed from transaction history, pool participation,
            and account age. Used to suggest financing credit limits.
          </p>

          {/* Grade legend */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {[['A','750+','Excellent'],['B','680–749','Good'],['C','580–679','Fair'],['D','<580','Poor']].map(([g, range, label]) => (
              <div key={g} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className={`badge ${GRADE_BADGE[g]}`}>{g}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{range} — {label}</span>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="loading">Loading credit scores…</div>
          ) : creditScores.length === 0 ? (
            <div className="empty-state">No credit scores computed yet.</div>
          ) : (
            <>
              {/* KPIs */}
              <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card">
                  <div className="stat-value">{creditScores.length}</div>
                  <div className="stat-label">Buyers Scored</div>
                </div>
                {(['A','B','C','D','F'] as const).map((g) => {
                  const cnt = creditScores.filter((s) => s.grade === g).length;
                  return cnt > 0 ? (
                    <div key={g} className="stat-card">
                      <div className="stat-value" style={{ color: GRADE_COLOUR[g] }}>{cnt}</div>
                      <div className="stat-label">Grade {g}</div>
                    </div>
                  ) : null;
                })}
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Buyer</th>
                      <th>Score</th>
                      <th>Grade</th>
                      <th>Credit Limit</th>
                      <th>On-time Rate</th>
                      <th>Transactions</th>
                      <th>Factors</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditScores.map((cs) => (
                      <tr key={cs.buyer_id}>
                        <td>
                          <strong>{cs.buyer_name}</strong>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{cs.buyer_email}</div>
                        </td>
                        <td>
                          <span style={{ fontSize: '1.3rem', fontWeight: 800, color: GRADE_COLOUR[cs.grade] }}>
                            {cs.score}
                          </span>
                          {scoreBar(cs.score - 300, 550, GRADE_COLOUR[cs.grade])}
                        </td>
                        <td>
                          <span className={`badge ${GRADE_BADGE[cs.grade]}`} style={{ fontSize: '1rem', padding: '0.25rem 0.75rem' }}>
                            {cs.grade}
                          </span>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: 2 }}>
                            {cs.creditworthiness}
                          </div>
                        </td>
                        <td style={{ fontWeight: 700 }}>{fmt(cs.suggested_limit)}</td>
                        <td>
                          {Number(cs.on_time_rate).toFixed(0)}%
                          {scoreBar(Number(cs.on_time_rate), 100, '#16a34a')}
                        </td>
                        <td>{cs.transaction_count}</td>
                        <td style={{ maxWidth: 220 }}>
                          <details>
                            <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: 'var(--primary)' }}>
                              {(cs.factors ?? []).length} factor(s)
                            </summary>
                            <ul style={{ marginTop: '0.5rem', paddingLeft: '1rem', fontSize: '0.8rem' }}>
                              {(cs.factors ?? []).map((f, i) => (
                                <li key={i} style={{ marginBottom: '0.3rem', color: f.impact === 'positive' ? '#166534' : f.impact === 'negative' ? '#991b1b' : '#374151' }}>
                                  {IMPACT_ICON[f.impact]} {f.label}: {f.detail}
                                </li>
                              ))}
                            </ul>
                          </details>
                        </td>
                        <td>
                          <button
                            className="btn-primary btn-sm"
                            disabled={running}
                            onClick={() => recomputeCredit(cs.buyer_id, cs.buyer_name ?? cs.buyer_id)}
                          >
                            {running ? '⏳' : '🔄 Recompute'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Tab: Pricing Insights ── */}
      {tab === 'pricing' && (
        <>
          <h2 className="section-title">💡 Pricing Insights</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Recommended price ranges for supplier catalog items, derived from accepted quotes
            and existing catalog data. Confidence reflects data availability.
          </p>

          {loading ? (
            <div className="loading">Loading pricing insights…</div>
          ) : pricingInsights.length === 0 ? (
            <div className="empty-state">No pricing insights computed yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Min (PKR)</th>
                    <th>Optimal (PKR)</th>
                    <th>Max (PKR)</th>
                    <th>Market Median</th>
                    <th>Competitors</th>
                    <th>Confidence</th>
                    <th>Reasoning</th>
                  </tr>
                </thead>
                <tbody>
                  {pricingInsights.map((pi) => (
                    <tr key={pi.id ?? `${pi.supplier_id}-${pi.product_name}`}>
                      <td><strong>{pi.supplier_name ?? pi.supplier_id}</strong></td>
                      <td>{pi.product_name}</td>
                      <td>
                        {pi.category ? (
                          <span className="badge badge-grey">{pi.category}</span>
                        ) : '—'}
                      </td>
                      <td style={{ color: '#6b7280' }}>{Number(pi.suggested_min).toLocaleString()}</td>
                      <td style={{ fontWeight: 800, color: '#16a34a', fontSize: '1.05rem' }}>
                        {Number(pi.suggested_optimal).toLocaleString()}
                      </td>
                      <td style={{ color: '#6b7280' }}>{Number(pi.suggested_max).toLocaleString()}</td>
                      <td>
                        {pi.market_median
                          ? Number(pi.market_median).toLocaleString()
                          : <span style={{ color: '#9ca3af' }}>—</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>{pi.competitor_count}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: Number(pi.confidence) >= 70 ? '#16a34a' : Number(pi.confidence) >= 40 ? '#d97706' : '#dc2626' }}>
                          {Number(pi.confidence).toFixed(0)}%
                        </span>
                        {scoreBar(Number(pi.confidence), 100, Number(pi.confidence) >= 70 ? '#16a34a' : Number(pi.confidence) >= 40 ? '#d97706' : '#dc2626')}
                      </td>
                      <td style={{ maxWidth: 200 }}>
                        <details>
                          <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: 'var(--primary)' }}>View</summary>
                          <ul style={{ marginTop: '0.5rem', paddingLeft: '1rem', fontSize: '0.79rem', color: 'var(--text-muted)' }}>
                            {Object.entries(pi.reasoning ?? {}).map(([k, v]) => (
                              <li key={k} style={{ marginBottom: '0.25rem' }}><strong>{k}:</strong> {v}</li>
                            ))}
                          </ul>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}

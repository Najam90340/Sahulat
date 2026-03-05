/**
 * supplierMatcher.ts
 *
 * Deterministic heuristic engine for ranking suppliers against a given RFQ.
 * This is the v1 placeholder; the scoring algorithm is designed to be swapped
 * for a trained ML model (e.g. a Python FastAPI microservice) by changing the
 * single `computeScores()` export.
 *
 * Scoring dimensions (each 0-100):
 *   1. location_score  – same city as RFQ: 100, same region: 60, otherwise: 20
 *   2. catalog_score   – supplier has catalog items matching the product: 0-100
 *   3. performance_score – based on accepted quotes / total quotes + verification
 *   4. price_score     – competitive pricing vs market median (from catalog_items)
 *
 * Composite score = weighted sum:
 *   35% location + 25% performance + 25% catalog + 15% price
 */

import pool from '../../config/database';
import {
  AiSupplierMatch,
  SupplierMatchReasoning,
} from '../../models/types';

const MODEL_VERSION = 'heuristic-v1';

const REGION_MAP: Record<string, string> = {
  lahore: 'punjab', faisalabad: 'punjab', rawalpindi: 'punjab',
  islamabad: 'punjab', multan: 'punjab', gujranwala: 'punjab',
  karachi: 'sindh', hyderabad: 'sindh', sukkur: 'sindh',
  peshawar: 'kpk', abbottabad: 'kpk', mardan: 'kpk',
  quetta: 'balochistan', gwadar: 'balochistan',
};

function getRegion(city: string): string {
  return REGION_MAP[city.toLowerCase().trim()] ?? 'other';
}

function locationScore(supplierCity: string, rfqCity: string): number {
  const s = supplierCity.toLowerCase().trim();
  const r = rfqCity.toLowerCase().trim();
  if (s === r) return 100;
  if (getRegion(s) === getRegion(r) && getRegion(s) !== 'other') return 60;
  return 20;
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, v));
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

interface SupplierRow {
  supplier_id: string;
  supplier_name: string;
  supplier_city: string;
  verification_status: string;
  total_quotes: number;
  accepted_quotes: number;
  catalog_match_count: number;
  avg_catalog_price: number | null;
}

export async function matchSuppliers(rfqId: string): Promise<AiSupplierMatch[]> {
  // Fetch RFQ details
  const rfqRes = await pool.query(
    `SELECT r.*, u.city AS buyer_city
       FROM rfqs r
       JOIN users u ON u.id = r.buyer_id
      WHERE r.id = $1`,
    [rfqId],
  );
  if (!rfqRes.rows.length) throw new Error('RFQ not found');
  const rfq = rfqRes.rows[0];

  // Fetch all suppliers with aggregated stats
  const suppliersRes = await pool.query<SupplierRow>(`
    SELECT
      u.id                                                          AS supplier_id,
      u.name                                                        AS supplier_name,
      COALESCE(u.city, '')                                          AS supplier_city,
      u.verification_status,
      COUNT(DISTINCT q.id)::int                                     AS total_quotes,
      COUNT(DISTINCT q.id) FILTER (WHERE q.status = 'accepted')::int AS accepted_quotes,
      COUNT(DISTINCT ci.id) FILTER (
        WHERE ci.product_name ILIKE $1 OR ci.category ILIKE $2
      )::int                                                        AS catalog_match_count,
      AVG(ci.price) FILTER (
        WHERE ci.price IS NOT NULL
      )                                                             AS avg_catalog_price
    FROM users u
    LEFT JOIN quotes q ON q.supplier_id = u.id
    LEFT JOIN catalog_items ci ON ci.supplier_id = u.id AND ci.is_active = TRUE
    WHERE u.role = 'supplier'
    GROUP BY u.id
  `, [`%${rfq.product_name}%`, `%${rfq.product_name}%`]);

  if (!suppliersRes.rows.length) return [];

  // Compute market median price for price_score baseline
  const priceValues = suppliersRes.rows
    .map((s: SupplierRow) => s.avg_catalog_price)
    .filter((p: number | null): p is number => p !== null);
  const marketMedian =
    priceValues.length
      ? priceValues.sort((a: number, b: number) => a - b)[Math.floor(priceValues.length / 2)]
      : null;

  // Score each supplier
  const scored = suppliersRes.rows.map((s: SupplierRow) => {
    // 1. Location
    // Resolve RFQ city: prefer rfq.city, fall back to buyer's city.
    // If both are absent we cannot compute a meaningful location score,
    // so we use 'unknown' which will map to region 'other' and score 20 (lowest).
    const rfqCity = (rfq.city ?? rfq.buyer_city ?? 'unknown').trim() || 'unknown';
    const locScore = locationScore(s.supplier_city, rfqCity);

    // 2. Performance (accepted rate + verification bonus)
    const acceptRate = s.total_quotes > 0
      ? (s.accepted_quotes / s.total_quotes) * 100
      : 30; // prior for new suppliers
    const verBonus =
      s.verification_status === 'premium' ? 15
      : s.verification_status === 'verified' ? 8
      : 0;
    const perfScore = clamp(acceptRate + verBonus);

    // 3. Catalog match (0 = 10, 1 = 60, 2+ = 100)
    const catScore = s.catalog_match_count === 0 ? 10
      : s.catalog_match_count === 1 ? 60
      : clamp(60 + (s.catalog_match_count - 1) * 10);

    // 4. Price competitiveness
    let priceScoreVal = 50; // neutral when no data
    if (marketMedian !== null && s.avg_catalog_price !== null) {
      const ratio = s.avg_catalog_price / marketMedian;
      // Cheaper than median is better; 20% below = 100, 20% above = 0
      priceScoreVal = clamp(Math.round(100 - (ratio - 0.8) * 250));
    }

    // Composite (weighted)
    const composite = round2(
      locScore * 0.35 +
      perfScore * 0.25 +
      catScore * 0.25 +
      priceScoreVal * 0.15,
    );

    const reasoning: SupplierMatchReasoning = {
      location: `Supplier in ${s.supplier_city || 'unknown'} – city ${locScore === 100 ? 'matches' : locScore === 60 ? 'same region' : 'different region'} (score ${locScore})`,
      performance: `${s.accepted_quotes}/${s.total_quotes} quotes accepted${verBonus > 0 ? `, +${verBonus} verification bonus` : ''} (score ${round2(perfScore)})`,
      catalog: `${s.catalog_match_count} catalog item(s) match the RFQ product (score ${catScore})`,
      price: marketMedian !== null && s.avg_catalog_price !== null
        ? `Avg price PKR ${Math.round(s.avg_catalog_price)}, market median PKR ${Math.round(marketMedian)} (score ${priceScoreVal})`
        : 'No catalog price data available (score neutral)',
    };

    return {
      supplier_id: s.supplier_id,
      supplier_name: s.supplier_name,
      supplier_city: s.supplier_city,
      verification_status: s.verification_status,
      total_quotes: s.total_quotes,
      score: composite,
      location_score: round2(locScore),
      performance_score: round2(perfScore),
      catalog_score: round2(catScore),
      price_score: round2(priceScoreVal),
      reasoning,
    };
  });

  // Sort descending by composite score, assign ranks
  scored.sort((a: { score: number }, b: { score: number }) => b.score - a.score);

  // Upsert into DB for historical tracking and admin inspection
  const results: AiSupplierMatch[] = [];

  for (let i = 0; i < scored.length; i++) {
    const s = scored[i];
    const rank = i + 1;
    const { rows } = await pool.query<AiSupplierMatch>(
      `INSERT INTO ai_supplier_matches
         (rfq_id, supplier_id, score, location_score, performance_score,
          catalog_score, price_score, rank, reasoning, model_version)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)
       ON CONFLICT (rfq_id, supplier_id)
       DO UPDATE SET
         score = EXCLUDED.score,
         location_score = EXCLUDED.location_score,
         performance_score = EXCLUDED.performance_score,
         catalog_score = EXCLUDED.catalog_score,
         price_score = EXCLUDED.price_score,
         rank = EXCLUDED.rank,
         reasoning = EXCLUDED.reasoning,
         model_version = EXCLUDED.model_version,
         created_at = NOW()
       RETURNING *`,
      [
        rfqId, s.supplier_id, s.score,
        s.location_score, s.performance_score,
        s.catalog_score, s.price_score,
        rank, JSON.stringify(s.reasoning), MODEL_VERSION,
      ],
    );

    results.push({
      ...rows[0],
      supplier_name: s.supplier_name,
      supplier_city: s.supplier_city,
      verification_status: s.verification_status,
      total_quotes: s.total_quotes,
    });
  }

  return results;
}

export async function getMatchesForRfq(rfqId: string): Promise<AiSupplierMatch[]> {
  const { rows } = await pool.query<AiSupplierMatch>(
    `SELECT m.*, u.name AS supplier_name, u.city AS supplier_city,
            u.verification_status
       FROM ai_supplier_matches m
       JOIN users u ON u.id = m.supplier_id
      WHERE m.rfq_id = $1
      ORDER BY m.rank ASC`,
    [rfqId],
  );
  return rows;
}

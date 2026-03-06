/**
 * pricingAdvisor.ts
 *
 * Deterministic heuristic engine for recommending catalog pricing to suppliers.
 *
 * Strategy:
 *   1. Collect all accepted-quote prices for the same product name (cross-supplier)
 *   2. Collect catalog prices from other suppliers for the same product
 *   3. Derive market_median, p10 (floor), p90 (ceiling)
 *   4. Suggest: min = p10, max = p90, optimal = market_median × adjustment factor
 *      based on supplier's performance score
 *
 * Confidence = f(data points, recency)
 *
 * Upgrade path: The `computePricingInsight()` function can be replaced with a
 * call to a Python FastAPI endpoint that runs a trained regression model.
 */

import pool from '../../config/database';
import { AiPricingInsight, AiPricingReasoning } from '../../models/types';

const MODEL_VERSION = 'heuristic-v1';

function percentile(sortedArr: number[], p: number): number {
  if (!sortedArr.length) return 0;
  const idx = Math.floor((p / 100) * (sortedArr.length - 1));
  return sortedArr[idx];
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

interface MarketData {
  source: string;
  price: number;
}

export async function computePricingInsight(
  supplierId: string,
  productName: string,
  category?: string,
): Promise<AiPricingInsight> {
  // Fetch supplier info
  const supplierRes = await pool.query(
    `SELECT id, name, verification_status FROM users WHERE id = $1 AND role = 'supplier'`,
    [supplierId],
  );
  if (!supplierRes.rows.length) throw new Error('Supplier not found');
  const supplier = supplierRes.rows[0];

  // Collect market price data from two sources
  const [quoteRes, catalogRes] = await Promise.all([
    // Accepted quotes for similar products (cross-supplier market signal)
    pool.query<{ price_per_unit: number; supplier_id: string }>(
      `SELECT q.price_per_unit, q.supplier_id
         FROM quotes q
         JOIN rfqs r ON r.id = q.rfq_id
        WHERE q.status = 'accepted'
          AND (r.product_name ILIKE $1 OR r.product_name ILIKE $2)
        ORDER BY q.created_at DESC
        LIMIT 100`,
      [`%${productName}%`, category ? `%${category}%` : `%${productName}%`],
    ),
    // Catalog items for same product from all suppliers
    pool.query<{ price: number; supplier_id: string }>(
      `SELECT price, supplier_id
         FROM catalog_items
        WHERE price IS NOT NULL
          AND is_active = TRUE
          AND (product_name ILIKE $1 OR category ILIKE $2)
        ORDER BY updated_at DESC
        LIMIT 100`,
      [`%${productName}%`, category ? `%${category}%` : `%${productName}%`],
    ),
  ]);

  const marketData: MarketData[] = [
    ...quoteRes.rows.map((r: { price_per_unit: number; supplier_id: string }) => ({ source: 'quote', price: Number(r.price_per_unit) })),
    ...catalogRes.rows.map((r: { price: number; supplier_id: string }) => ({ source: 'catalog', price: Number(r.price) })),
  ].filter((d) => d.price > 0);

  const prices = marketData.map((d) => d.price).sort((a, b) => a - b);
  const competitorCount = new Set([
    ...quoteRes.rows.filter((r: { supplier_id: string }) => r.supplier_id !== supplierId).map((r: { supplier_id: string }) => r.supplier_id),
    ...catalogRes.rows.filter((r: { supplier_id: string }) => r.supplier_id !== supplierId).map((r: { supplier_id: string }) => r.supplier_id),
  ]).size;

  let suggestedMin: number;
  let suggestedMax: number;
  let suggestedOptimal: number;
  let marketMedian: number | undefined;
  let confidence: number;
  let reasoning: AiPricingReasoning;

  if (prices.length >= 3) {
    const p10 = percentile(prices, 10);
    const p50 = percentile(prices, 50);
    const p90 = percentile(prices, 90);
    marketMedian = p50;

    // Performance-based adjustment: verified/premium suppliers can command a
    // small premium (~5-10%) since buyers trust them more
    const premiumFactor =
      supplier.verification_status === 'premium' ? 1.08
      : supplier.verification_status === 'verified' ? 1.04
      : 1.0;

    suggestedMin     = round2(p10);
    suggestedMax     = round2(p90);
    suggestedOptimal = round2(p50 * premiumFactor);
    confidence       = Math.min(95, 50 + prices.length * 2);

    reasoning = {
      basis: `Analysis of ${prices.length} data point(s) from ${marketData.filter(d => d.source === 'quote').length} accepted quotes and ${marketData.filter(d => d.source === 'catalog').length} catalog listings.`,
      market_note: `Market prices range from PKR ${Math.round(p10)} (p10) to PKR ${Math.round(p90)} (p90), with a median of PKR ${Math.round(p50)}.`,
      recommendation:
        supplier.verification_status !== 'pending'
          ? `As a ${supplier.verification_status} supplier you can command a ${Math.round((premiumFactor - 1) * 100)}% trust premium. Recommended optimal: PKR ${Math.round(suggestedOptimal)}.`
          : `Position near median (PKR ${Math.round(p50)}) to compete while awaiting verification.`,
    };
  } else {
    // Insufficient data – provide conservative placeholder estimates
    suggestedMin     = 100;
    suggestedMax     = 1000;
    suggestedOptimal = 500;
    confidence       = 15 + prices.length * 5;

    reasoning = {
      basis: `Insufficient market data (${prices.length} data point(s)) for "${productName}".`,
      market_note: 'Placeholder ranges provided. Accuracy will improve as more quotes and catalog data accumulate.',
      recommendation: 'Start near the suggested optimal and adjust based on buyer response.',
    };
  }

  // Upsert into DB using a single ON CONFLICT DO UPDATE to handle both insert and update
  const { rows } = await pool.query<AiPricingInsight>(
    `INSERT INTO ai_pricing_insights
       (supplier_id, product_name, category, suggested_min, suggested_max,
        suggested_optimal, market_median, competitor_count, confidence,
        reasoning, model_version)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)
     ON CONFLICT (supplier_id, product_name)
     DO UPDATE SET
       category         = EXCLUDED.category,
       suggested_min    = EXCLUDED.suggested_min,
       suggested_max    = EXCLUDED.suggested_max,
       suggested_optimal = EXCLUDED.suggested_optimal,
       market_median    = EXCLUDED.market_median,
       competitor_count = EXCLUDED.competitor_count,
       confidence       = EXCLUDED.confidence,
       reasoning        = EXCLUDED.reasoning,
       model_version    = EXCLUDED.model_version,
       computed_at      = NOW()
     RETURNING *`,
    [
      supplierId, productName, category ?? null,
      suggestedMin, suggestedMax, suggestedOptimal,
      marketMedian ?? null, competitorCount, confidence,
      JSON.stringify(reasoning), MODEL_VERSION,
    ],
  );

  return { ...rows[0], supplier_name: supplier.name };
}

export async function listPricingInsights(supplierId?: string): Promise<AiPricingInsight[]> {
  const { rows } = await pool.query<AiPricingInsight>(
    `SELECT pi.*, u.name AS supplier_name
       FROM ai_pricing_insights pi
       JOIN users u ON u.id = pi.supplier_id
      ${supplierId ? 'WHERE pi.supplier_id = $1' : ''}
      ORDER BY pi.computed_at DESC`,
    supplierId ? [supplierId] : [],
  );
  return rows;
}

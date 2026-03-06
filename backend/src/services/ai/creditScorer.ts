/**
 * creditScorer.ts
 *
 * Deterministic heuristic engine for estimating buyer creditworthiness.
 * Uses historical transaction data (on-time payments, pool participation,
 * total spend, account age) to produce a FICO-style 300-850 score.
 *
 * Upgrade path: Replace `computeScore()` with a call to an external
 * Python/ML service.  The DB persistence and API surface remain unchanged.
 *
 * Score bands:
 *   750-850 → A (Excellent)
 *   680-749 → B (Good)
 *   580-679 → C (Fair)
 *   300-579 → D/F (Poor)
 */

import pool from '../../config/database';
import {
  AiCreditScore,
  AiCreditFactor,
  CreditGrade,
  Creditworthiness,
} from '../../models/types';

const MODEL_VERSION = 'heuristic-v1';

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function scoreToGrade(score: number): CreditGrade {
  if (score >= 750) return 'A';
  if (score >= 680) return 'B';
  if (score >= 580) return 'C';
  if (score >= 480) return 'D';
  return 'F';
}

function gradeToWorthiness(grade: CreditGrade): Creditworthiness {
  if (grade === 'A') return 'excellent';
  if (grade === 'B') return 'good';
  if (grade === 'C') return 'fair';
  return 'poor';
}

function suggestedLimit(score: number): number {
  // PKR credit limit tiers
  if (score >= 750) return 500_000;
  if (score >= 680) return 200_000;
  if (score >= 580) return 75_000;
  if (score >= 480) return 25_000;
  return 5_000;
}

interface BuyerStats {
  buyer_id: string;
  buyer_name: string;
  buyer_email: string;
  account_age_days: number;
  transaction_count: number;
  total_paid: number;
  released_count: number;  // on-time payments (status = 'released')
  refunded_count: number;  // disputes/refunds
  failed_count: number;
  avg_pool_size: number;
  pool_count: number;
}

export async function computeCreditScore(buyerId: string): Promise<AiCreditScore> {
  const statsRes = await pool.query<BuyerStats>(`
    SELECT
      u.id                                                        AS buyer_id,
      u.name                                                      AS buyer_name,
      u.email                                                     AS buyer_email,
      FLOOR(EXTRACT(EPOCH FROM NOW() - u.created_at) / 86400)::int   AS account_age_days,
      COUNT(t.id)::int                                            AS transaction_count,
      COALESCE(SUM(t.amount), 0)                                  AS total_paid,
      COUNT(t.id) FILTER (WHERE t.status = 'released')::int       AS released_count,
      COUNT(t.id) FILTER (WHERE t.status = 'refunded')::int       AS refunded_count,
      COUNT(t.id) FILTER (WHERE t.status = 'failed')::int         AS failed_count,
      COALESCE(AVG(pm.quantity * 1.0), 0)                        AS avg_pool_size,
      COUNT(DISTINCT pm.pool_id)::int                             AS pool_count
    FROM users u
    LEFT JOIN transactions t    ON t.buyer_id = u.id
    LEFT JOIN pool_members pm   ON pm.buyer_id = u.id
    WHERE u.id = $1 AND u.role = 'buyer'
    GROUP BY u.id
  `, [buyerId]);

  if (!statsRes.rows.length) throw new Error('Buyer not found');
  const s = statsRes.rows[0];

  const factors: AiCreditFactor[] = [];

  // ── Component 1: On-time payment rate (35% weight → max 192 raw points) ──
  const onTimeRate = s.transaction_count > 0
    ? (s.released_count / s.transaction_count) * 100
    : 50; // prior for new buyers

  let paymentPoints = Math.round(onTimeRate * 1.92); // max 192

  if (onTimeRate >= 95) {
    factors.push({ label: 'Excellent payment history', impact: 'positive', detail: `${s.released_count}/${s.transaction_count} transactions released` });
  } else if (onTimeRate >= 75) {
    factors.push({ label: 'Good payment history', impact: 'positive', detail: `${s.released_count}/${s.transaction_count} transactions released` });
  } else if (s.refunded_count > 0) {
    const penalty = s.refunded_count * 10;
    paymentPoints -= penalty;
    factors.push({ label: 'Refund/dispute history', impact: 'negative', detail: `${s.refunded_count} refund(s) on record` });
  }

  // ── Component 2: Total credit utilisation / spend (30% weight → max 165) ──
  let spendPoints = 0;
  if (s.total_paid >= 500_000) { spendPoints = 165; }
  else if (s.total_paid >= 200_000) { spendPoints = 130; }
  else if (s.total_paid >= 50_000) { spendPoints = 95; }
  else if (s.total_paid >= 10_000) { spendPoints = 60; }
  else { spendPoints = 20; }

  factors.push({
    label: 'Transaction volume',
    impact: spendPoints >= 95 ? 'positive' : spendPoints >= 60 ? 'neutral' : 'negative',
    detail: `Total spend PKR ${Number(s.total_paid).toLocaleString()} across ${s.transaction_count} transaction(s)`,
  });

  // ── Component 3: Pool participation depth (20% weight → max 110) ──
  let poolPoints = 0;
  if (s.pool_count >= 10) { poolPoints = 110; }
  else if (s.pool_count >= 5) { poolPoints = 80; }
  else if (s.pool_count >= 2) { poolPoints = 50; }
  else if (s.pool_count >= 1) { poolPoints = 30; }
  else { poolPoints = 0; }

  factors.push({
    label: 'Pool participation',
    impact: s.pool_count >= 5 ? 'positive' : s.pool_count >= 1 ? 'neutral' : 'negative',
    detail: `Joined ${s.pool_count} buying pool(s), avg quantity ${Math.round(Number(s.avg_pool_size))} units`,
  });

  // ── Component 4: Account age (15% weight → max 83) ──
  let agePoints = 0;
  if (s.account_age_days >= 365) { agePoints = 83; }
  else if (s.account_age_days >= 180) { agePoints = 60; }
  else if (s.account_age_days >= 90) { agePoints = 40; }
  else if (s.account_age_days >= 30) { agePoints = 20; }
  else { agePoints = 5; }

  factors.push({
    label: 'Account age',
    impact: agePoints >= 60 ? 'positive' : agePoints >= 20 ? 'neutral' : 'negative',
    detail: `Account active for ${s.account_age_days} day(s)`,
  });

  // ── Composite score (300-850) ──
  const rawTotal = clamp(paymentPoints + spendPoints + poolPoints + agePoints, 0, 550);
  const finalScore = 300 + rawTotal;
  const grade = scoreToGrade(finalScore);
  const creditworthiness = gradeToWorthiness(grade);
  const limit = suggestedLimit(finalScore);

  // Upsert into DB
  const { rows } = await pool.query<AiCreditScore>(
    `INSERT INTO ai_credit_scores
       (buyer_id, score, grade, creditworthiness, suggested_limit, factors,
        transaction_count, total_paid, avg_pool_size, on_time_rate, model_version)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11)
     ON CONFLICT (buyer_id) DO UPDATE SET
       score            = EXCLUDED.score,
       grade            = EXCLUDED.grade,
       creditworthiness = EXCLUDED.creditworthiness,
       suggested_limit  = EXCLUDED.suggested_limit,
       factors          = EXCLUDED.factors,
       transaction_count = EXCLUDED.transaction_count,
       total_paid       = EXCLUDED.total_paid,
       avg_pool_size    = EXCLUDED.avg_pool_size,
       on_time_rate     = EXCLUDED.on_time_rate,
       model_version    = EXCLUDED.model_version,
       computed_at      = NOW()
     RETURNING *`,
    [
      buyerId, finalScore, grade, creditworthiness, limit,
      JSON.stringify(factors),
      s.transaction_count, s.total_paid, s.avg_pool_size, onTimeRate,
      MODEL_VERSION,
    ],
  );

  return {
    ...rows[0],
    buyer_name: s.buyer_name,
    buyer_email: s.buyer_email,
  };
}

export async function getCreditScore(buyerId: string): Promise<AiCreditScore | null> {
  const { rows } = await pool.query<AiCreditScore>(
    `SELECT cs.*, u.name AS buyer_name, u.email AS buyer_email
       FROM ai_credit_scores cs
       JOIN users u ON u.id = cs.buyer_id
      WHERE cs.buyer_id = $1`,
    [buyerId],
  );
  return rows[0] ?? null;
}

export async function listCreditScores(): Promise<AiCreditScore[]> {
  const { rows } = await pool.query<AiCreditScore>(
    `SELECT cs.*, u.name AS buyer_name, u.email AS buyer_email
       FROM ai_credit_scores cs
       JOIN users u ON u.id = cs.buyer_id
      ORDER BY cs.score DESC`,
  );
  return rows;
}

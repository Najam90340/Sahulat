import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { matchSuppliers, getMatchesForRfq } from '../services/ai/supplierMatcher';
import { computeCreditScore, getCreditScore, listCreditScores } from '../services/ai/creditScorer';
import { computePricingInsight, listPricingInsights } from '../services/ai/pricingAdvisor';
import {
  SupplierMatchRequest,
  CreditScoreRequest,
  PricingInsightRequest,
} from '../models/types';

/** Creates a typed AppError with an HTTP status code. */
function makeError(message: string, statusCode: number): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// ── Supplier Matching ─────────────────────────────────────────────────────────

/**
 * POST /api/ai/supplier-match
 * Body: { rfq_id: string }
 * Runs the matching engine, upserts results, returns ranked supplier list.
 */
export const runSupplierMatch = async (
  req: Request<object, object, SupplierMatchRequest>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { rfq_id } = req.body;
    if (!rfq_id) return next(makeError('rfq_id is required', 400));
    const matches = await matchSuppliers(rfq_id);
    res.json({ success: true, data: matches, model_version: 'heuristic-v1' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/ai/supplier-match/:rfqId
 * Returns cached match results for a previously scored RFQ.
 */
export const getSupplierMatches = async (
  req: Request<{ rfqId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const matches = await getMatchesForRfq(req.params.rfqId);
    res.json({ success: true, data: matches });
  } catch (error) {
    next(error);
  }
};

// ── Credit Scoring ────────────────────────────────────────────────────────────

/**
 * POST /api/ai/credit-score
 * Body: { buyer_id: string }
 * Computes (or refreshes) a buyer's credit score from transaction history.
 */
export const runCreditScore = async (
  req: Request<object, object, CreditScoreRequest>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { buyer_id } = req.body;
    if (!buyer_id) return next(makeError('buyer_id is required', 400));
    const result = await computeCreditScore(buyer_id);
    res.json({ success: true, data: result, model_version: 'heuristic-v1' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/ai/credit-score/:buyerId
 * Returns cached credit score for a buyer.
 */
export const getBuyerCreditScore = async (
  req: Request<{ buyerId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await getCreditScore(req.params.buyerId);
    if (!result) return next(makeError('No credit score found. POST to /api/ai/credit-score to compute.', 404));
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/ai/credit-scores
 * Returns all buyer credit scores (admin view).
 */
export const getAllCreditScores = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const scores = await listCreditScores();
    res.json({ success: true, data: scores });
  } catch (error) {
    next(error);
  }
};

// ── Pricing Insights ──────────────────────────────────────────────────────────

/**
 * POST /api/ai/pricing-insights
 * Body: { supplier_id, product_name, category? }
 * Computes pricing recommendation for a supplier + product combination.
 */
export const runPricingInsight = async (
  req: Request<object, object, PricingInsightRequest>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { supplier_id, product_name, category } = req.body;
    if (!supplier_id || !product_name) return next(makeError('supplier_id and product_name are required', 400));
    const result = await computePricingInsight(supplier_id, product_name, category);
    res.json({ success: true, data: result, model_version: 'heuristic-v1' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/ai/pricing-insights
 * Query: ?supplier_id=<uuid>  (optional; omit for all)
 * Returns cached pricing insights.
 */
export const getPricingInsights = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { supplier_id } = req.query as { supplier_id?: string };
    const insights = await listPricingInsights(supplier_id);
    res.json({ success: true, data: insights });
  } catch (error) {
    next(error);
  }
};

// ── AI Overview / Status ──────────────────────────────────────────────────────

/**
 * GET /api/ai/status
 * Returns a summary of computed AI results (model health dashboard).
 */
export const getAiStatus = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [matchCount, creditCount, pricingCount] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS cnt FROM ai_supplier_matches`),
      pool.query(`SELECT COUNT(*) AS cnt, AVG(score) AS avg_score FROM ai_credit_scores`),
      pool.query(`SELECT COUNT(*) AS cnt, AVG(confidence) AS avg_confidence FROM ai_pricing_insights`),
    ]);

    res.json({
      success: true,
      data: {
        model_version: 'heuristic-v1',
        status: 'operational',
        capabilities: [
          {
            name: 'Supplier Matching',
            endpoint: 'POST /api/ai/supplier-match',
            description: 'Ranks suppliers against an RFQ using location, performance, catalog and price signals.',
            records_computed: Number(matchCount.rows[0].cnt),
          },
          {
            name: 'Buyer Credit Scoring',
            endpoint: 'POST /api/ai/credit-score',
            description: 'Estimates buyer creditworthiness (300-850 FICO-style) from transaction history.',
            records_computed: Number(creditCount.rows[0].cnt),
            avg_score: creditCount.rows[0].avg_score ? Math.round(Number(creditCount.rows[0].avg_score)) : null,
          },
          {
            name: 'Pricing Insights',
            endpoint: 'POST /api/ai/pricing-insights',
            description: 'Recommends competitive price ranges for suppliers based on market quotes and catalog data.',
            records_computed: Number(pricingCount.rows[0].cnt),
            avg_confidence: pricingCount.rows[0].avg_confidence ? Math.round(Number(pricingCount.rows[0].avg_confidence)) : null,
          },
        ],
        upgrade_notes: {
          current_approach: 'Deterministic heuristic scoring (no external ML dependency)',
          next_milestone: 'Replace scoring functions with calls to Python FastAPI microservice (ai-services/)',
          feature_flag: 'Set AI_SERVICE_URL env var to enable external ML backend',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

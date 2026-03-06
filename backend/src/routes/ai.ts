import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  runSupplierMatch,
  getSupplierMatches,
  runCreditScore,
  getBuyerCreditScore,
  getAllCreditScores,
  runPricingInsight,
  getPricingInsights,
  getAiStatus,
} from '../controllers/aiController';

const router = Router();

/**
 * Rate limiter for AI endpoints.
 * Compute endpoints (POST) are capped tighter (20/15 min) because scoring is
 * CPU/DB intensive; read endpoints allow 60/15 min for dashboard polling.
 */
const computeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many AI compute requests. Please wait a moment.' },
});

const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

// Status / health
router.get('/status', readLimiter, getAiStatus);

// Supplier matching
router.post('/supplier-match', computeLimiter, runSupplierMatch);
router.get('/supplier-match/:rfqId', readLimiter, getSupplierMatches);

// Buyer credit scoring
router.post('/credit-score', computeLimiter, runCreditScore);
router.get('/credit-scores', readLimiter, getAllCreditScores);
router.get('/credit-score/:buyerId', readLimiter, getBuyerCreditScore);

// Pricing insights
router.post('/pricing-insights', computeLimiter, runPricingInsight);
router.get('/pricing-insights', readLimiter, getPricingInsights);

export default router;

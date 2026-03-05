import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  listSuppliers,
  getSupplier,
  updateSupplierVerification,
  getAnalytics,
  listDisputes,
  createDispute,
  getDispute,
  updateDispute,
  getEscrowOverview,
  listSubscriptions,
  createSubscription,
  updateSubscription,
  listPromotions,
  createPromotion,
  updatePromotion,
  deactivatePromotion,
} from '../controllers/adminController';

const router = Router();

/**
 * Rate limiter for admin API endpoints.
 * Allows 120 requests per 15-minute window per IP – sufficient for
 * legitimate dashboard use while blocking automated scraping or brute force.
 */
const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
});

// Apply limiter to every admin route
router.use(adminRateLimiter);

// Analytics
router.get('/analytics', getAnalytics);

// Suppliers
router.get('/suppliers', listSuppliers);
router.get('/suppliers/:id', getSupplier);
router.patch('/suppliers/:id/verify', updateSupplierVerification);

// Disputes
router.get('/disputes', listDisputes);
router.post('/disputes', createDispute);
router.get('/disputes/:id', getDispute);
router.patch('/disputes/:id', updateDispute);

// Escrow
router.get('/escrow', getEscrowOverview);

// Subscriptions
router.get('/subscriptions', listSubscriptions);
router.post('/subscriptions', createSubscription);
router.patch('/subscriptions/:id', updateSubscription);

// Promotions
router.get('/promotions', listPromotions);
router.post('/promotions', createPromotion);
router.patch('/promotions/:id', updatePromotion);
router.delete('/promotions/:id', deactivatePromotion);

export default router;

import { Router } from 'express';
import {
  initiatePayment,
  paymentCallback,
  releaseFunds,
  releaseAllPoolFunds,
  refundTransaction,
  refundAllPoolTransactions,
  listPoolTransactions,
  listBuyerTransactions,
  getTransaction,
} from '../controllers/paymentController';

const router = Router();

// Initiation and callbacks
router.post('/initiate', initiatePayment);
router.post('/callback', paymentCallback);

// Per-transaction actions
router.get('/:id', getTransaction);
router.post('/:id/release', releaseFunds);
router.post('/:id/refund', refundTransaction);

// Pool-wide batch actions
router.get('/pool/:poolId', listPoolTransactions);
router.post('/pool/:poolId/release-all', releaseAllPoolFunds);
router.post('/pool/:poolId/refund-all', refundAllPoolTransactions);

// Buyer history
router.get('/buyer/:buyerId', listBuyerTransactions);

export default router;

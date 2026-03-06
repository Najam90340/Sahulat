import { Router } from 'express';
import { createRfq, listRfqs, getRfq, updateRfqStatus } from '../controllers/rfqController';
import { submitQuote, listQuotesForRfq } from '../controllers/quoteController';

const router = Router();

router.post('/', createRfq);
router.get('/', listRfqs);
router.get('/:id', getRfq);
router.patch('/:id/status', updateRfqStatus);
router.post('/:id/quotes', submitQuote);
router.get('/:id/quotes', listQuotesForRfq);

export default router;

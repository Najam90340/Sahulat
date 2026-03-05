import { Router } from 'express';
import { updateQuoteStatus } from '../controllers/quoteController';

const router = Router();

router.patch('/:id/status', updateQuoteStatus);

export default router;

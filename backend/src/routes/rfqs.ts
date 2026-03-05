import { Router } from 'express';
import { createRfq, listRfqs, getRfq, updateRfqStatus } from '../controllers/rfqController';

const router = Router();

router.post('/', createRfq);
router.get('/', listRfqs);
router.get('/:id', getRfq);
router.patch('/:id/status', updateRfqStatus);

export default router;

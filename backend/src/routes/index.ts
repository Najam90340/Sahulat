import { Router } from 'express';
import rfqsRouter from './rfqs';
import poolsRouter from './pools';
import suppliersRouter from './suppliers';
import catalogRouter from './catalog';
import quotesRouter from './quotes';
import adminRouter from './admin';
import paymentsRouter from './payments';
import shipmentsRouter from './shipments';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ message: 'Sahulat API v1' });
});

router.use('/rfqs', rfqsRouter);
router.use('/pools', poolsRouter);
router.use('/suppliers', suppliersRouter);
router.use('/catalog', catalogRouter);
router.use('/quotes', quotesRouter);
router.use('/admin', adminRouter);
router.use('/payments', paymentsRouter);
router.use('/shipments', shipmentsRouter);

export default router;

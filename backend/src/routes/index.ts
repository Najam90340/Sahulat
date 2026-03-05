import { Router } from 'express';
import rfqsRouter from './rfqs';
import poolsRouter from './pools';
import suppliersRouter from './suppliers';
import catalogRouter from './catalog';
import quotesRouter from './quotes';
import adminRouter from './admin';

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

export default router;

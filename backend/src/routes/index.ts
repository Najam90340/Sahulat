import { Router } from 'express';
import rfqsRouter from './rfqs';
import poolsRouter from './pools';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ message: 'Sahulat API v1' });
});

router.use('/rfqs', rfqsRouter);
router.use('/pools', poolsRouter);

export default router;

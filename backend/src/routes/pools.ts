import { Router } from 'express';
import { createPool, listPools, getPool, joinPool, streamPoolProgress } from '../controllers/poolController';

const router = Router();

router.post('/', createPool);
router.get('/', listPools);
router.get('/:id', getPool);
router.post('/:id/join', joinPool);
router.get('/:id/progress', streamPoolProgress);

export default router;

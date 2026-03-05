import { Router } from 'express';
import {
  listSuppliers,
  getSupplier,
  updateSupplierVerification,
  getAnalytics,
} from '../controllers/adminController';

const router = Router();

router.get('/analytics', getAnalytics);
router.get('/suppliers', listSuppliers);
router.get('/suppliers/:id', getSupplier);
router.patch('/suppliers/:id/verify', updateSupplierVerification);

export default router;

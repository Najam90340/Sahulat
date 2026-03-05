import { Router } from 'express';
import {
  getSupplierDashboard,
  getSupplierOrders,
  getSupplierAnalytics,
} from '../controllers/supplierController';
import { listQuotesBySupplier } from '../controllers/quoteController';

const router = Router();

router.get('/:supplierId/dashboard', getSupplierDashboard);
router.get('/:supplierId/orders', getSupplierOrders);
router.get('/:supplierId/analytics', getSupplierAnalytics);
router.get('/:supplierId/quotes', listQuotesBySupplier);

export default router;

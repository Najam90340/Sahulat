import { Router } from 'express';
import {
  createCatalogItem,
  listCatalogItems,
  getCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
} from '../controllers/catalogController';

const router = Router();

router.post('/', createCatalogItem);
router.get('/', listCatalogItems);
router.get('/:id', getCatalogItem);
router.patch('/:id', updateCatalogItem);
router.delete('/:id', deleteCatalogItem);

export default router;

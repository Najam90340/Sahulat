import { Router } from 'express';
import {
  createShipment,
  getShipment,
  listShipments,
  listPoolShipments,
  listBuyerShipments,
  listSupplierShipments,
  updateShipmentStatus,
  addShipmentEvent,
  getShipmentEvents,
  streamShipmentStatus,
  submitDeliveryProof,
  getDeliveryProof,
} from '../controllers/shipmentController';

const router = Router();

// Collection
router.get('/', listShipments);
router.post('/', createShipment);

// Scoped lists
router.get('/pool/:poolId', listPoolShipments);
router.get('/buyer/:buyerId', listBuyerShipments);
router.get('/supplier/:supplierId', listSupplierShipments);

// Single shipment
router.get('/:id', getShipment);
router.patch('/:id/status', updateShipmentStatus);

// Tracking events
router.get('/:id/events', getShipmentEvents);
router.post('/:id/events', addShipmentEvent);
router.get('/:id/stream', streamShipmentStatus);

// Delivery proof
router.get('/:id/proof', getDeliveryProof);
router.post('/:id/proof', submitDeliveryProof);

export default router;

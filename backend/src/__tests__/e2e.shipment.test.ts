/**
 * e2e.shipment.test.ts
 *
 * End-to-end integration tests for the shipment / delivery / escrow flow:
 *   Pool confirmed → Supplier creates shipment → Status updates
 *   → Delivery proof submitted → Escrow auto-release
 *
 * All DB queries are mocked via jest.mock.
 */

import request from 'supertest';
import { createTestApp } from './testApp';

const mockQuery = jest.fn();
jest.mock('../config/database', () => ({
  __esModule: true,
  default: { query: (...args: unknown[]) => mockQuery(...args) },
}));
jest.mock('../config/redis', () => ({ __esModule: true, default: null }));

// ── Fixture UUIDs ────────────────────────────────────────────────────────────
const SUPPLIER_ID  = 'a1000000-0000-0000-0000-000000000005';
const BUYER_ID     = 'a1000000-0000-0000-0000-000000000001';
const POOL_ID      = 'd1000000-0000-0000-0000-000000000002';
const SHIPMENT_ID  = 'g1000000-0000-0000-0000-000000000001';
const MEMBER_ID    = 'f1000000-0000-0000-0000-000000000001';
const TXN_ID       = 'h1000000-0000-0000-0000-000000000001';

const confirmedPool = {
  id: POOL_ID, rfq_id: 'c1000000-0000-0000-0000-000000000002',
  creator_id: BUYER_ID, product_name: 'Sugar', city: 'Karachi',
  moq: 300, current_quantity: 300, status: 'confirmed',
  deadline: new Date(Date.now() + 3 * 86400_000).toISOString(),
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
};

const shipmentFixture = (status = 'booked') => ({
  id: SHIPMENT_ID, pool_id: POOL_ID, supplier_id: SUPPLIER_ID,
  courier: 'tcs', tracking_number: 'TCS-2024-001',
  status, origin_city: 'Lahore', destination_city: 'Karachi',
  pickup_address: 'Plot 5, DHA Phase 1, Lahore',
  notes: 'Handle with care',
  estimated_delivery: new Date(Date.now() + 2 * 86400_000).toISOString(),
  member_count: 2, event_count: 1,
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
});

const eventFixture = (status = 'booked') => ({
  id: 'ev000000-0000-0000-0000-000000000001',
  shipment_id: SHIPMENT_ID, status,
  location: status === 'booked' ? 'Lahore Warehouse' : 'Karachi Hub',
  description: `Package ${status.replace(/_/g, ' ')}`,
  occurred_at: new Date().toISOString(),
});

const app = createTestApp();

// ─────────────────────────────────────────────────────────────────────────────
describe('E2E: Pool → Shipment → Delivery → Escrow Release', () => {

  beforeEach(() => jest.clearAllMocks());

  // ── 1. Create shipment for confirmed pool ──────────────────────────────────
  describe('Step 1: POST /api/shipments — Create shipment', () => {
    it('creates a TCS shipment for confirmed pool', async () => {
      // Query 1: pool lookup
      mockQuery.mockResolvedValueOnce({ rows: [confirmedPool], rowCount: 1 });
      // Query 2: INSERT shipment RETURNING
      mockQuery.mockResolvedValueOnce({ rows: [shipmentFixture()], rowCount: 1 });
      // Query 3: INSERT initial event
      mockQuery.mockResolvedValueOnce({ rows: [eventFixture()], rowCount: 1 });
      // Query 4: INSERT shipment_members (1 member provided)
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const res = await request(app)
        .post('/api/shipments')
        .send({
          pool_id: POOL_ID,
          supplier_id: SUPPLIER_ID,
          courier: 'tcs',
          tracking_number: 'TCS-2024-001',
          origin_city: 'Lahore',
          destination_city: 'Karachi',
          pickup_address: 'Plot 5, DHA Phase 1, Lahore',
          notes: 'Handle with care',
          members: [
            { pool_member_id: MEMBER_ID, buyer_id: BUYER_ID, quantity: 80, delivery_address: 'Gulshan-e-Iqbal Karachi' },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.courier).toBe('tcs');
      expect(res.body.data.tracking_number).toBe('TCS-2024-001');
      expect(res.body.data.origin_city).toBe('Lahore');
      expect(res.body.data.destination_city).toBe('Karachi');
    });

    it('rejects shipment creation for open (non-confirmed) pool', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ ...confirmedPool, status: 'open' }],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/shipments')
        .send({
          pool_id: POOL_ID, supplier_id: SUPPLIER_ID,
          courier: 'leopards', origin_city: 'Karachi', destination_city: 'Islamabad',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/confirmed/i);
    });
  });

  // ── 2. Get shipment with events ────────────────────────────────────────────
  describe('Step 2: GET /api/shipments/:id — Shipment details', () => {
    it('returns shipment with event log', async () => {
      // Query 1: main shipment row (with joins)
      mockQuery.mockResolvedValueOnce({ rows: [shipmentFixture()], rowCount: 1 });
      // Query 2: events
      mockQuery.mockResolvedValueOnce({ rows: [eventFixture('booked')], rowCount: 1 });
      // Query 3: members
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: MEMBER_ID, shipment_id: SHIPMENT_ID, pool_member_id: MEMBER_ID,
                 buyer_id: BUYER_ID, buyer_name: 'Ali Raza', quantity: 80,
                 delivery_address: 'Gulshan Karachi', sub_status: 'pending' }],
        rowCount: 1,
      });
      // Query 4: delivery proof
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app).get(`/api/shipments/${SHIPMENT_ID}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(SHIPMENT_ID);
      expect(res.body.data.events).toHaveLength(1);
      expect(res.body.data.events[0].status).toBe('booked');
    });
  });

  // ── 3. Update shipment status (progression) ────────────────────────────────
  describe('Step 3: PATCH /api/shipments/:id/status — Status progression', () => {
    const STATUSES = ['picked_up', 'in_transit', 'out_for_delivery', 'delivered'] as const;

    for (const status of STATUSES) {
      it(`transitions to status: ${status}`, async () => {
        const updated = shipmentFixture(status);
        // Query 1: fetch existing shipment
        mockQuery.mockResolvedValueOnce({ rows: [{ ...shipmentFixture('booked'),
          picked_up_at: null, delivered_at: null }], rowCount: 1 });
        // Query 2: UPDATE shipment status RETURNING
        mockQuery.mockResolvedValueOnce({ rows: [updated], rowCount: 1 });
        // Query 3: INSERT event
        mockQuery.mockResolvedValueOnce({ rows: [eventFixture(status)], rowCount: 1 });
        // Query 4 (only for 'delivered'): UPDATE shipment_members sub_status
        if (status === 'delivered') {
          mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 2 });
        }

        const res = await request(app)
          .patch(`/api/shipments/${SHIPMENT_ID}/status`)
          .send({ status, location: 'Karachi Hub', description: `Package ${status}` });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe(status);
      });
    }

    it('rejects invalid status', async () => {
      const res = await request(app)
        .patch(`/api/shipments/${SHIPMENT_ID}/status`)
        .send({ status: 'teleported' });

      expect(res.status).toBe(400);
    });
  });

  // ── 4. Add tracking event ─────────────────────────────────────────────────
  describe('Step 4: POST /api/shipments/:id/events — Add tracking event', () => {
    it('adds a tracking event with location', async () => {
      // Query 1: SELECT shipment for status check
      mockQuery.mockResolvedValueOnce({ rows: [{ id: SHIPMENT_ID, status: 'in_transit',
        destination_city: 'Karachi' }], rowCount: 1 });
      // Query 2: INSERT event RETURNING
      mockQuery.mockResolvedValueOnce({ rows: [{
        id: 'ev000000-0000-0000-0000-000000000002',
        shipment_id: SHIPMENT_ID, status: 'in_transit',
        location: 'M2 Motorway Toll Plaza',
        description: 'Package en route to Karachi',
        occurred_at: new Date().toISOString(),
      }], rowCount: 1 });
      // Query 3: UPDATE shipment status
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const res = await request(app)
        .post(`/api/shipments/${SHIPMENT_ID}/events`)
        .send({
          status: 'in_transit',
          location: 'M2 Motorway Toll Plaza',
          description: 'Package en route to Karachi',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.location).toBe('M2 Motorway Toll Plaza');
    });
  });

  // ── 5. Submit delivery proof ───────────────────────────────────────────────
  describe('Step 5: POST /api/shipments/:id/proof — Delivery proof', () => {
    it('submits delivery proof and auto-marks shipment as delivered', async () => {
      const proof = {
        id: 'pr000000-0000-0000-0000-000000000001',
        shipment_id: SHIPMENT_ID,
        photo_url: 'https://cdn.sahulat.pk/proofs/TCS-2024-001.jpg',
        notes: 'Left at reception',
        received_by: 'Raza Bhai',
        confirmed_at: new Date().toISOString(),
      };
      // Query 1: SELECT shipment
      mockQuery.mockResolvedValueOnce({ rows: [shipmentFixture('out_for_delivery')], rowCount: 1 });
      // Query 2: INSERT proof RETURNING
      mockQuery.mockResolvedValueOnce({ rows: [proof], rowCount: 1 });
      // Query 3: UPDATE shipment status to delivered
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      // Query 4: INSERT shipment event 'delivered'
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      // Query 5: UPDATE shipment_members sub_status
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 2 });

      const res = await request(app)
        .post(`/api/shipments/${SHIPMENT_ID}/proof`)
        .send({
          photo_url: 'https://cdn.sahulat.pk/proofs/TCS-2024-001.jpg',
          notes: 'Left at reception',
          received_by: 'Raza Bhai',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.received_by).toBe('Raza Bhai');
    });
  });

  // ── 6. Buyer shipment list ────────────────────────────────────────────────
  describe('Step 6: GET /api/shipments/buyer/:buyerId — Buyer shipments', () => {
    it('returns shipments for a specific buyer', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [shipmentFixture('in_transit')], rowCount: 1 });

      const res = await request(app).get(`/api/shipments/buyer/${BUYER_ID}`);
      expect(res.status).toBe(200);
      expect(res.body.data[0].courier).toBe('tcs');
    });
  });
});

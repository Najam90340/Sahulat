/**
 * e2e.rfq-pool-payment.test.ts
 *
 * End-to-end integration tests covering the full buyer flow:
 *   RFQ creation → Pool join → Pool auto-confirm → Payment initiation
 *   → Escrow hold → Escrow release (delivery confirmed)
 *
 * The PostgreSQL client (`../config/database`) and payment gateways are
 * mocked so these tests run without a real database connection.
 */

import request from 'supertest';
import { createTestApp } from './testApp';

// ── Mock the database pool ──────────────────────────────────────────────────
// We intercept every pool.query() call and return controlled fixtures.

const mockQuery = jest.fn();
jest.mock('../config/database', () => ({
  __esModule: true,
  default: { query: (...args: unknown[]) => mockQuery(...args) },
}));

// ── Mock Redis (not used in these flows, but imported by some modules) ──────
jest.mock('../config/redis', () => ({
  __esModule: true,
  default: null,
}));

// ── Fixture UUIDs ────────────────────────────────────────────────────────────
const BUYER_ID    = 'a1000000-0000-0000-0000-000000000001';
const SUPPLIER_ID = 'a1000000-0000-0000-0000-000000000005';
const PRODUCT_ID  = 'b1000000-0000-0000-0000-000000000001';
const RFQ_ID      = 'c1000000-0000-0000-0000-000000000010';
const POOL_ID     = 'd1000000-0000-0000-0000-000000000010';
const MEMBER_ID   = 'f1000000-0000-0000-0000-000000000010';
const TXN_ID      = 'h1000000-0000-0000-0000-000000000010';
const SHIPMENT_ID = 'g1000000-0000-0000-0000-000000000010';

const rfqFixture = {
  id: RFQ_ID, buyer_id: BUYER_ID, product_id: PRODUCT_ID,
  product_name: 'Basmati Rice', quantity: 150, city: 'Lahore',
  description: 'Premium long-grain basmati', status: 'open',
  images: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  buyer_name: 'Ali Raza',
};

const poolFixture = (status = 'open', currentQty = 150) => ({
  id: POOL_ID, rfq_id: RFQ_ID, creator_id: BUYER_ID,
  product_name: 'Basmati Rice', city: 'Lahore',
  moq: 500, current_quantity: currentQty, status,
  deadline: new Date(Date.now() + 7 * 86400_000).toISOString(),
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  progress_pct: Math.round((currentQty / 500) * 100),
  member_count: 1,
});

const memberFixture = (status = 'pending') => ({
  id: MEMBER_ID, pool_id: POOL_ID, buyer_id: BUYER_ID,
  quantity: 150, amount_paid: 0, status,
  joined_at: new Date().toISOString(),
});

const transactionFixture = (status = 'initiated') => ({
  id: TXN_ID, pool_id: POOL_ID, pool_member_id: MEMBER_ID,
  buyer_id: BUYER_ID, amount: 12750.00, currency: 'PKR',
  payment_method: 'easypaisa', gateway_ref: 'EP-TEST-001', status,
  phone: '0300-1234567',
  initiated_at: new Date().toISOString(),
  held_at: status === 'held' || status === 'released' ? new Date().toISOString() : null,
  released_at: status === 'released' ? new Date().toISOString() : null,
  metadata: {},
});

const app = createTestApp();

// ─────────────────────────────────────────────────────────────────────────────
describe('E2E: RFQ → Pool → Payment → Escrow', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. Create RFQ ──────────────────────────────────────────────────────────
  describe('Step 1: POST /api/rfqs — Create RFQ', () => {
    it('creates an RFQ with valid payload (PKR / Lahore)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [rfqFixture], rowCount: 1 });

      const res = await request(app)
        .post('/api/rfqs')
        .send({
          buyer_id: BUYER_ID,
          product_id: PRODUCT_ID,
          product_name: 'Basmati Rice',
          quantity: 150,
          city: 'Lahore',
          description: 'Premium long-grain basmati',
          images: [],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.product_name).toBe('Basmati Rice');
      expect(res.body.data.city).toBe('Lahore');
      expect(res.body.data.quantity).toBe(150);
    });

    it('rejects RFQ with missing required fields', async () => {
      const res = await request(app)
        .post('/api/rfqs')
        .send({ buyer_id: BUYER_ID }); // missing product_name, quantity, city

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns paginated RFQ list with buyer name', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [rfqFixture], rowCount: 1 });

      const res = await request(app).get('/api/rfqs');
      expect(res.status).toBe(200);
      expect(res.body.data[0].buyer_name).toBe('Ali Raza');
    });

    it('filters RFQs by city (Lahore)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [rfqFixture], rowCount: 1 });

      const res = await request(app).get('/api/rfqs?city=Lahore');
      expect(res.status).toBe(200);
      expect(res.body.data[0].city).toBe('Lahore');
    });
  });

  // ── 2. Create Pool (quantity < MOQ) ───────────────────────────────────────
  describe('Step 2: POST /api/pools — Create buying pool', () => {
    it('creates a pool from a valid RFQ (quantity 150 < MOQ 500)', async () => {
      // getRFQ check
      mockQuery.mockResolvedValueOnce({ rows: [rfqFixture], rowCount: 1 });
      // check no existing open pool
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      // insert pool
      mockQuery.mockResolvedValueOnce({ rows: [poolFixture()], rowCount: 1 });
      // auto-add creator as member
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      // mark RFQ as pooled
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      // refreshPoolQuantity (tryAutoConfirm) — UPDATE pools RETURNING
      mockQuery.mockResolvedValueOnce({ rows: [poolFixture('open', 150)], rowCount: 1 });

      const res = await request(app)
        .post('/api/pools')
        .send({ rfq_id: RFQ_ID, creator_id: BUYER_ID, moq: 500 });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('open');
      expect(res.body.data.moq).toBe(500);
    });

    it('rejects duplicate pool creation for same RFQ', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [rfqFixture], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [poolFixture()], rowCount: 1 }); // existing pool found

      const res = await request(app)
        .post('/api/pools')
        .send({ rfq_id: RFQ_ID, creator_id: BUYER_ID, moq: 500 });

      expect(res.status).toBe(409);
    });
  });

  // ── 3. Join Pool ──────────────────────────────────────────────────────────
  describe('Step 3: POST /api/pools/:id/join — Buyer joins pool', () => {
    it('adds a buyer to the pool and auto-confirms when MOQ met', async () => {
      const confirmedPool = poolFixture('confirmed', 500);
      // fetch pool
      mockQuery.mockResolvedValueOnce({ rows: [poolFixture('open', 350)], rowCount: 1 });
      // insert member
      mockQuery.mockResolvedValueOnce({ rows: [memberFixture()], rowCount: 1 });
      // refreshPoolQuantity → UPDATE pools RETURNING
      mockQuery.mockResolvedValueOnce({ rows: [{ ...poolFixture('open', 500), current_quantity: 500 }], rowCount: 1 });
      // tryAutoConfirm → confirm pool
      mockQuery.mockResolvedValueOnce({ rows: [confirmedPool], rowCount: 1 });
      // confirm pool members
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      // mark RFQ confirmed
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const res = await request(app)
        .post(`/api/pools/${POOL_ID}/join`)
        .send({ buyer_id: BUYER_ID, quantity: 150 });

      expect(res.status).toBe(201);
      expect(res.body.data.pool.status).toBe('confirmed');
    });

    it('rejects join with zero or negative quantity', async () => {
      const res = await request(app)
        .post(`/api/pools/${POOL_ID}/join`)
        .send({ buyer_id: BUYER_ID, quantity: 0 });

      expect(res.status).toBe(400);
    });
  });

  // ── 4. Initiate Payment (escrow) ──────────────────────────────────────────
  describe('Step 4: POST /api/payments/initiate — Escrow payment', () => {
    it('initiates Easypaisa escrow payment for a confirmed pool member', async () => {
      const heldTxn = transactionFixture('held');
      // pool lookup
      mockQuery.mockResolvedValueOnce({
        rows: [{ ...poolFixture('confirmed', 500), product_name: 'Basmati Rice' }],
        rowCount: 1,
      });
      // member check
      mockQuery.mockResolvedValueOnce({ rows: [memberFixture('confirmed')], rowCount: 1 });
      // existing transaction check
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      // INSERT transaction
      mockQuery.mockResolvedValueOnce({ rows: [transactionFixture('initiated')], rowCount: 1 });
      // UPDATE transaction to 'held' after gateway call
      mockQuery.mockResolvedValueOnce({ rows: [heldTxn], rowCount: 1 });

      const res = await request(app)
        .post('/api/payments/initiate')
        .send({
          buyer_id: BUYER_ID,
          pool_id: POOL_ID,
          payment_method: 'easypaisa',
          amount: 12750.00,
          phone: '0300-1234567',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transaction.currency).toBe('PKR');
      expect(res.body.data.transaction.payment_method).toBe('easypaisa');
    });

    it('rejects payment for non-confirmed pool', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ ...poolFixture('open', 200), product_name: 'Basmati Rice' }],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/payments/initiate')
        .send({
          buyer_id: BUYER_ID, pool_id: POOL_ID,
          payment_method: 'easypaisa', amount: 5000, phone: '0300-1234567',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/confirmed/i);
    });

    it('rejects invalid payment method', async () => {
      const res = await request(app)
        .post('/api/payments/initiate')
        .send({
          buyer_id: BUYER_ID, pool_id: POOL_ID,
          payment_method: 'crypto', amount: 5000,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Invalid payment_method/i);
    });

    it('accepts JazzCash payment method', async () => {
      const heldTxn = { ...transactionFixture('held'), payment_method: 'jazzcash' };
      mockQuery.mockResolvedValueOnce({
        rows: [{ ...poolFixture('confirmed', 500), product_name: 'Sugar' }],
        rowCount: 1,
      });
      mockQuery.mockResolvedValueOnce({ rows: [memberFixture('confirmed')], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      mockQuery.mockResolvedValueOnce({ rows: [{ ...transactionFixture('initiated'), payment_method: 'jazzcash' }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [heldTxn], rowCount: 1 });

      const res = await request(app)
        .post('/api/payments/initiate')
        .send({
          buyer_id: BUYER_ID, pool_id: POOL_ID,
          payment_method: 'jazzcash', amount: 8000, phone: '0301-9876543',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.transaction.payment_method).toBe('jazzcash');
    });
  });

  // ── 5. Escrow Release (delivery confirmed) ────────────────────────────────
  describe('Step 5: POST /api/payments/:id/release — Escrow release', () => {
    it('releases escrow funds after delivery confirmation', async () => {
      const releasedTxn = transactionFixture('released');
      // fetch transaction
      mockQuery.mockResolvedValueOnce({ rows: [transactionFixture('held')], rowCount: 1 });
      // UPDATE transaction to released
      mockQuery.mockResolvedValueOnce({ rows: [releasedTxn], rowCount: 1 });

      const res = await request(app)
        .post(`/api/payments/${TXN_ID}/release`)
        .send({ released_by: SUPPLIER_ID });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('released');
      expect(res.body.data.released_at).toBeTruthy();
    });

    it('rejects release for non-held transaction', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [transactionFixture('initiated')],
        rowCount: 1,
      });

      const res = await request(app)
        .post(`/api/payments/${TXN_ID}/release`)
        .send({ released_by: SUPPLIER_ID });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/held/i);
    });
  });

  // ── 6. Payment Status ─────────────────────────────────────────────────────
  describe('Step 6: GET /api/payments/:id — Payment status', () => {
    it('returns transaction status and pool details', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [transactionFixture('held')], rowCount: 1 });

      const res = await request(app).get(`/api/payments/${TXN_ID}`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('held');
      expect(res.body.data.currency).toBe('PKR');
    });

    it('returns 404 for unknown transaction', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app).get('/api/payments/00000000-dead-beef-0000-000000000000');
      expect(res.status).toBe(404);
    });
  });

  // ── 7. Payment History ────────────────────────────────────────────────────
  describe('Step 7: GET /api/payments/buyer/:buyerId — Payment history', () => {
    it('returns buyer payment history ordered by date', async () => {
      const heldTxn = transactionFixture('held');
      const releasedTxn = { ...transactionFixture('released'), id: 'h2000000-0000-0000-0000-000000000010' };
      mockQuery.mockResolvedValueOnce({ rows: [heldTxn, releasedTxn], rowCount: 2 });

      const res = await request(app).get(`/api/payments/buyer/${BUYER_ID}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].currency).toBe('PKR');
    });
  });

  // ── 8. Health check ───────────────────────────────────────────────────────
  describe('Health Check', () => {
    it('GET /api/health returns ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});

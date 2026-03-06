-- Sample Users (buyers and suppliers)
INSERT INTO users (id, name, email, phone, role, city, verification_status) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Ali Raza',       'ali@example.com',      '0300-1234567', 'buyer',    'Lahore',    'pending'),
  ('a1000000-0000-0000-0000-000000000002', 'Sara Khan',      'sara@example.com',     '0301-2345678', 'buyer',    'Karachi',   'pending'),
  ('a1000000-0000-0000-0000-000000000003', 'Usman Malik',    'usman@example.com',    '0302-3456789', 'buyer',    'Islamabad', 'pending'),
  ('a1000000-0000-0000-0000-000000000004', 'Zara Ahmed',     'zara@example.com',     '0303-4567890', 'buyer',    'Lahore',    'pending'),
  ('a1000000-0000-0000-0000-000000000005', 'Global Goods',   'supplier@global.pk',   '0321-9999999', 'supplier', 'Lahore',    'verified'),
  ('a1000000-0000-0000-0000-000000000006', 'Prime Supplies', 'prime@supplies.pk',    '0322-8888888', 'supplier', 'Karachi',   'pending'),
  ('a1000000-0000-0000-0000-000000000007', 'Elite Traders',  'elite@traders.pk',     '0323-7777777', 'supplier', 'Islamabad', 'premium')
ON CONFLICT (email) DO NOTHING;

-- Sample Products
INSERT INTO products (id, name, category, description, unit, moq) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Basmati Rice',     'Grains',       '1kg Premium Basmati',       'kg',    500),
  ('b1000000-0000-0000-0000-000000000002', 'Cooking Oil',      'Groceries',    '5L Sunflower Cooking Oil',  'litre', 200),
  ('b1000000-0000-0000-0000-000000000003', 'Sugar',            'Groceries',    'Refined White Sugar',       'kg',    300),
  ('b1000000-0000-0000-0000-000000000004', 'Wheat Flour',      'Grains',       'Chakki Fresh Atta 10kg',    'kg',    400),
  ('b1000000-0000-0000-0000-000000000005', 'Mobile Charger',   'Electronics',  'Type-C Fast Charger 65W',   'pcs',   100)
ON CONFLICT DO NOTHING;

-- Sample RFQs
INSERT INTO rfqs (id, buyer_id, product_id, product_name, quantity, city, description, status, images) VALUES
  (
    'c1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'Basmati Rice',
    150,
    'Lahore',
    'Need 150kg of premium basmati rice for restaurant use',
    'pooled',
    '{}'
  ),
  (
    'c1000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000002',
    'b1000000-0000-0000-0000-000000000003',
    'Sugar',
    80,
    'Karachi',
    'Bulk sugar purchase for bakery',
    'pooled',
    '{}'
  ),
  (
    'c1000000-0000-0000-0000-000000000003',
    'a1000000-0000-0000-0000-000000000003',
    'b1000000-0000-0000-0000-000000000005',
    'Mobile Charger',
    30,
    'Islamabad',
    'Type-C fast chargers for resale',
    'open',
    '{}'
  )
ON CONFLICT DO NOTHING;

-- Sample Pools (created because quantity < MOQ)
INSERT INTO pools (id, rfq_id, creator_id, product_name, city, moq, current_quantity, status, deadline) VALUES
  (
    'd1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'Basmati Rice',
    'Lahore',
    500,
    350,
    'open',
    NOW() + INTERVAL '7 days'
  ),
  (
    'd1000000-0000-0000-0000-000000000002',
    'c1000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000002',
    'Sugar',
    'Karachi',
    300,
    300,
    'confirmed',
    NOW() + INTERVAL '3 days'
  )
ON CONFLICT DO NOTHING;

-- Sample Pool Members
INSERT INTO pool_members (pool_id, buyer_id, quantity, amount_paid, status) VALUES
  -- Pool 1: Basmati Rice – open, partial fill
  ('d1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 150, 0.00, 'pending'),
  ('d1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 100, 0.00, 'pending'),
  ('d1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000004', 100, 0.00, 'pending'),

  -- Pool 2: Sugar – confirmed (MOQ met)
  ('d1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 80,  0.00, 'confirmed'),
  ('d1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000004', 220, 0.00, 'confirmed')
ON CONFLICT DO NOTHING;

-- Sample Catalog Items
INSERT INTO catalog_items (id, supplier_id, product_name, category, description, unit, moq, price, is_active) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000005', 'Basmati Rice',   'Grains',      '1kg Premium Basmati',      'kg',    500, 85.00,  TRUE),
  ('e1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000005', 'Cooking Oil',    'Groceries',   '5L Sunflower Cooking Oil', 'litre', 200, 320.00, TRUE),
  ('e1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000007', 'Mobile Charger', 'Electronics', 'Type-C Fast Charger 65W',  'pcs',   100, 450.00, TRUE)
ON CONFLICT DO NOTHING;

-- Sample Quotes
INSERT INTO quotes (id, rfq_id, supplier_id, price_per_unit, lead_time_days, notes, status) VALUES
  (
    'f1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000005',
    85.00,
    7,
    'Can deliver within 7 days. Price includes packaging.',
    'pending'
  ),
  (
    'f1000000-0000-0000-0000-000000000002',
    'c1000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000005',
    42.50,
    5,
    'Bulk discount available above 500kg.',
    'accepted'
  )
ON CONFLICT DO NOTHING;

-- Sample Transactions (escrow payments for confirmed Sugar pool)
-- Pool member IDs are auto-generated so we need to look them up via subquery
INSERT INTO transactions (pool_id, pool_member_id, buyer_id, amount, currency, payment_method, gateway_ref, status, held_at)
SELECT
  'd1000000-0000-0000-0000-000000000002',
  pm.id,
  pm.buyer_id,
  CASE pm.buyer_id
    WHEN 'a1000000-0000-0000-0000-000000000002' THEN 3400.00   -- 80kg × PKR 42.50
    WHEN 'a1000000-0000-0000-0000-000000000004' THEN 9350.00   -- 220kg × PKR 42.50
  END,
  'PKR',
  CASE pm.buyer_id
    WHEN 'a1000000-0000-0000-0000-000000000002' THEN 'jazzcash'
    WHEN 'a1000000-0000-0000-0000-000000000004' THEN 'easypaisa'
  END,
  CASE pm.buyer_id
    WHEN 'a1000000-0000-0000-0000-000000000002' THEN 'JC-SEED-001'
    WHEN 'a1000000-0000-0000-0000-000000000004' THEN 'EP-SEED-001'
  END,
  'held',
  NOW() - INTERVAL '1 day'
FROM pool_members pm
WHERE pm.pool_id = 'd1000000-0000-0000-0000-000000000002'
ON CONFLICT (pool_member_id) DO NOTHING;



-- ── Sample Conversations & Messages ────────────────────────────────────────
-- Conversation: Sara Khan (buyer) ↔ Global Goods (supplier) about Sugar RFQ

INSERT INTO conversations (id, buyer_id, supplier_id, rfq_id, pool_id, subject)
VALUES (
  'h1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000002',   -- Sara Khan
  'a1000000-0000-0000-0000-000000000005',   -- Global Goods Pvt Ltd
  'c1000000-0000-0000-0000-000000000002',   -- Sugar RFQ
  'd1000000-0000-0000-0000-000000000002',   -- Sugar Pool
  'Sugar Order — Pool Inquiry'
) ON CONFLICT (buyer_id, supplier_id, rfq_id) DO NOTHING;

INSERT INTO messages (conversation_id, sender_id, sender_role, type, body, is_read)
VALUES
  ('h1000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-000000000002', 'buyer', 'text',
   'السلام علیکم! میں نے آپ کا Sugar کا quote دیکھا۔ کیا آپ 500 units کے لیے پہلے سے order کر سکتے ہیں؟',
   TRUE),
  ('h1000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-000000000005', 'supplier', 'text',
   'وعلیکم السلام! جی ہاں، ہم pool کے ذریعے بڑے orders کے لیے تیار ہیں۔ MOQ 1000 units ہے لیکن آپ pool میں شامل ہو سکتے ہیں۔',
   TRUE),
  ('h1000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-000000000002', 'buyer', 'text',
   'What is the price per unit for Sugar?',
   TRUE),
  ('h1000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-000000000005', 'supplier', 'text',
   'Price is PKR 185 per kg with 3 days lead time. We offer consolidated delivery to Karachi, Lahore, and Islamabad.',
   FALSE),
  ('h1000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-000000000002', 'buyer', 'text',
   'Please send me more details about the delivery schedule.',
   FALSE)
ON CONFLICT DO NOTHING;

-- ── Admin Panel: Sample Disputes ─────────────────────────────────────────────

INSERT INTO disputes (id, transaction_id, buyer_id, supplier_id, pool_id, reason, status, raised_by)
VALUES
  (
    'k1000000-0000-0000-0000-000000000001',
    'h1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000005',
    'd1000000-0000-0000-0000-000000000001',
    'Supplier delivered incorrect quantity — received 80kg instead of 150kg of Basmati Rice.',
    'investigating',
    'buyer'
  ),
  (
    'k1000000-0000-0000-0000-000000000002',
    'h1000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000005',
    'd1000000-0000-0000-0000-000000000002',
    'Payment shows as released but supplier claims not received.',
    'open',
    'supplier'
  ),
  (
    'k1000000-0000-0000-0000-000000000003',
    NULL,
    'a1000000-0000-0000-0000-000000000003',
    'a1000000-0000-0000-0000-000000000006',
    NULL,
    'Product quality was significantly below what was described in the catalog.',
    'resolved_buyer',
    'buyer'
  )
ON CONFLICT DO NOTHING;

-- ── Admin Panel: Sample Subscriptions ────────────────────────────────────────

INSERT INTO subscriptions (id, supplier_id, plan, status, amount, currency, starts_at, expires_at)
VALUES
  (
    'l1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000005',  -- Global Goods
    'pro',
    'active',
    4999.00,
    'PKR',
    NOW() - INTERVAL '15 days',
    NOW() + INTERVAL '15 days'
  ),
  (
    'l1000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000006',  -- Prime Supplies
    'basic',
    'active',
    999.00,
    'PKR',
    NOW() - INTERVAL '5 days',
    NOW() + INTERVAL '25 days'
  ),
  (
    'l1000000-0000-0000-0000-000000000003',
    'a1000000-0000-0000-0000-000000000007',  -- Elite Traders
    'enterprise',
    'active',
    14999.00,
    'PKR',
    NOW() - INTERVAL '10 days',
    NOW() + INTERVAL '20 days'
  )
ON CONFLICT DO NOTHING;

-- ── Admin Panel: Sample Promotions ───────────────────────────────────────────

INSERT INTO promotions (id, code, description, type, value, min_order, max_discount, max_uses, uses_count, valid_from, valid_to, is_active)
VALUES
  (
    'm1000000-0000-0000-0000-000000000001',
    'WELCOME10',
    '10% off your first order',
    'percentage',
    10.00,
    1000.00,
    500.00,
    500,
    42,
    NOW() - INTERVAL '30 days',
    NOW() + INTERVAL '60 days',
    TRUE
  ),
  (
    'm1000000-0000-0000-0000-000000000002',
    'FLAT500',
    'PKR 500 flat discount on orders above 5000',
    'fixed',
    500.00,
    5000.00,
    NULL,
    200,
    18,
    NOW() - INTERVAL '15 days',
    NOW() + INTERVAL '15 days',
    TRUE
  ),
  (
    'm1000000-0000-0000-0000-000000000003',
    'RAMADAN20',
    'Ramadan special: 20% off for verified buyers',
    'percentage',
    20.00,
    2000.00,
    1000.00,
    1000,
    0,
    NOW() + INTERVAL '5 days',
    NOW() + INTERVAL '35 days',
    FALSE
  )
ON CONFLICT DO NOTHING;

-- ── AI Services: Pre-computed Supplier Match (for demo RFQ) ──────────────────
-- Match results for c1000000... (Basmati Rice RFQ from Ali Raza in Lahore)

INSERT INTO ai_supplier_matches
  (id, rfq_id, supplier_id, score, location_score, performance_score,
   catalog_score, price_score, rank, reasoning, model_version)
VALUES
  (
    'n1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000007',  -- Elite Traders (Islamabad, premium)
    78.25, 20, 91.25, 60, 50,
    1,
    '{"location":"Supplier in Islamabad – city different region (score 20)","performance":"5/6 quotes accepted, +15 verification bonus (score 91.25)","catalog":"1 catalog item(s) match the RFQ product (score 60)","price":"No catalog price data available (score neutral)"}',
    'heuristic-v1'
  ),
  (
    'n1000000-0000-0000-0000-000000000002',
    'c1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000005',  -- Global Goods (Lahore, verified)
    74.50, 100, 53.0, 10, 50,
    2,
    '{"location":"Supplier in Lahore – city matches (score 100)","performance":"2/4 quotes accepted, +8 verification bonus (score 53)","catalog":"0 catalog item(s) match the RFQ product (score 10)","price":"No catalog price data available (score neutral)"}',
    'heuristic-v1'
  ),
  (
    'n1000000-0000-0000-0000-000000000003',
    'c1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000006',  -- Prime Supplies (Karachi, pending)
    30.50, 20, 30.0, 10, 50,
    3,
    '{"location":"Supplier in Karachi – city different region (score 20)","performance":"No quote history, using prior 30 (score 30)","catalog":"0 catalog item(s) match the RFQ product (score 10)","price":"No catalog price data available (score neutral)"}',
    'heuristic-v1'
  )
ON CONFLICT (rfq_id, supplier_id) DO NOTHING;

-- ── AI Services: Pre-computed Credit Scores ───────────────────────────────────

INSERT INTO ai_credit_scores
  (id, buyer_id, score, grade, creditworthiness, suggested_limit, factors,
   transaction_count, total_paid, avg_pool_size, on_time_rate, model_version)
VALUES
  (
    'o1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',  -- Ali Raza
    720, 'B', 'good', 200000,
    '[{"label":"Good payment history","impact":"positive","detail":"3/4 transactions released"},{"label":"Transaction volume","impact":"neutral","detail":"Total spend PKR 28500 across 4 transactions"},{"label":"Pool participation","impact":"neutral","detail":"Joined 2 buying pools, avg quantity 95 units"},{"label":"Account age","impact":"positive","detail":"Account active for 180 days"}]',
    4, 28500, 95, 75, 'heuristic-v1'
  ),
  (
    'o1000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000002',  -- Sara Khan
    610, 'C', 'fair', 75000,
    '[{"label":"Good payment history","impact":"positive","detail":"2/2 transactions released"},{"label":"Transaction volume","impact":"negative","detail":"Total spend PKR 8000 across 2 transactions"},{"label":"Pool participation","impact":"neutral","detail":"Joined 1 buying pool, avg quantity 80 units"},{"label":"Account age","impact":"neutral","detail":"Account active for 60 days"}]',
    2, 8000, 80, 100, 'heuristic-v1'
  ),
  (
    'o1000000-0000-0000-0000-000000000003',
    'a1000000-0000-0000-0000-000000000003',  -- Usman Malik
    540, 'D', 'poor', 25000,
    '[{"label":"Excellent payment history","impact":"positive","detail":"1/1 transactions released"},{"label":"Transaction volume","impact":"negative","detail":"Total spend PKR 1500 across 1 transaction"},{"label":"Pool participation","impact":"negative","detail":"Joined 0 buying pools, avg quantity 0 units"},{"label":"Account age","impact":"neutral","detail":"Account active for 45 days"}]',
    1, 1500, 0, 100, 'heuristic-v1'
  ),
  (
    'o1000000-0000-0000-0000-000000000004',
    'a1000000-0000-0000-0000-000000000004',  -- Zara Ahmed
    780, 'A', 'excellent', 500000,
    '[{"label":"Excellent payment history","impact":"positive","detail":"8/8 transactions released"},{"label":"Transaction volume","impact":"positive","detail":"Total spend PKR 215000 across 8 transactions"},{"label":"Pool participation","impact":"positive","detail":"Joined 7 buying pools, avg quantity 120 units"},{"label":"Account age","impact":"positive","detail":"Account active for 400 days"}]',
    8, 215000, 120, 100, 'heuristic-v1'
  )
ON CONFLICT (buyer_id) DO NOTHING;

-- ── AI Services: Pre-computed Pricing Insights ────────────────────────────────

INSERT INTO ai_pricing_insights
  (id, supplier_id, product_name, category, suggested_min, suggested_max,
   suggested_optimal, market_median, competitor_count, confidence, reasoning, model_version)
VALUES
  (
    'p1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000005',  -- Global Goods
    'Basmati Rice', 'Grains',
    85.00, 145.00, 112.32, 108.00, 2, 72,
    '{"basis":"Analysis of 8 data points from 5 accepted quotes and 3 catalog listings.","market_note":"Market prices range from PKR 85 (p10) to PKR 145 (p90), with a median of PKR 108.","recommendation":"As a verified supplier you can command a 4% trust premium. Recommended optimal: PKR 112."}',
    'heuristic-v1'
  ),
  (
    'p1000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000007',  -- Elite Traders
    'Mobile Charger', 'Electronics',
    320.00, 680.00, 520.80, 501.00, 3, 68,
    '{"basis":"Analysis of 6 data points from 4 accepted quotes and 2 catalog listings.","market_note":"Market prices range from PKR 320 (p10) to PKR 680 (p90), with a median of PKR 501.","recommendation":"As a premium supplier you can command an 8% trust premium. Recommended optimal: PKR 541."}',
    'heuristic-v1'
  ),
  (
    'p1000000-0000-0000-0000-000000000003',
    'a1000000-0000-0000-0000-000000000006',  -- Prime Supplies
    'Sugar', 'Groceries',
    100.00, 1000.00, 500.00, NULL, 0, 15,
    '{"basis":"Insufficient market data (0 data points) for Sugar.","market_note":"Placeholder ranges provided. Accuracy will improve as more quotes and catalog data accumulate.","recommendation":"Start near the suggested optimal and adjust based on buyer response."}',
    'heuristic-v1'
  )
ON CONFLICT DO NOTHING;

-- ── Escrow Ledger (Transactions) ─────────────────────────────────────────────
-- One transaction per pool member for the confirmed Sugar pool (pool 2)
-- Pool members: Sara Khan (80 kg, 8000 PKR) and Zara Ahmed (220 kg, 22000 PKR)

-- First, we need the pool_member IDs from the sugar pool inserts above.
-- We use a DO block to insert transactions referencing pool_members by (pool_id, buyer_id).
DO $$
DECLARE
  v_member1_id UUID;
  v_member2_id UUID;
BEGIN
  SELECT id INTO v_member1_id
    FROM pool_members
   WHERE pool_id = 'd1000000-0000-0000-0000-000000000002'
     AND buyer_id = 'a1000000-0000-0000-0000-000000000002';  -- Sara Khan

  SELECT id INTO v_member2_id
    FROM pool_members
   WHERE pool_id = 'd1000000-0000-0000-0000-000000000002'
     AND buyer_id = 'a1000000-0000-0000-0000-000000000004';  -- Zara Ahmed

  IF v_member1_id IS NOT NULL THEN
    INSERT INTO transactions
      (id, pool_id, pool_member_id, buyer_id, amount, currency,
       payment_method, gateway_ref, status, phone,
       initiated_at, held_at, released_at, metadata)
    VALUES (
      'h1000000-0000-0000-0000-000000000001',
      'd1000000-0000-0000-0000-000000000002',
      v_member1_id,
      'a1000000-0000-0000-0000-000000000002',  -- Sara Khan
      8000.00, 'PKR', 'easypaisa', 'EP-STAGING-001', 'released',
      '0301-2345678',
      NOW() - INTERVAL '6 days',
      NOW() - INTERVAL '6 days' + INTERVAL '5 minutes',
      NOW() - INTERVAL '1 day',
      '{"gateway":"easypaisa","mobile":"0301-2345678","merchant":"SAHULAT-001"}'::jsonb
    ) ON CONFLICT (pool_member_id) DO NOTHING;
  END IF;

  IF v_member2_id IS NOT NULL THEN
    INSERT INTO transactions
      (id, pool_id, pool_member_id, buyer_id, amount, currency,
       payment_method, gateway_ref, status, phone,
       initiated_at, held_at, released_at, metadata)
    VALUES (
      'h1000000-0000-0000-0000-000000000002',
      'd1000000-0000-0000-0000-000000000002',
      v_member2_id,
      'a1000000-0000-0000-0000-000000000004',  -- Zara Ahmed
      22000.00, 'PKR', 'jazzcash', 'JC-STAGING-001', 'released',
      '0303-4567890',
      NOW() - INTERVAL '6 days',
      NOW() - INTERVAL '6 days' + INTERVAL '3 minutes',
      NOW() - INTERVAL '1 day',
      '{"gateway":"jazzcash","mobile":"0303-4567890","merchant":"SAHULAT-001"}'::jsonb
    ) ON CONFLICT (pool_member_id) DO NOTHING;
  END IF;
END
$$;

-- ── Shipments ─────────────────────────────────────────────────────────────────
-- Consolidated shipment for the confirmed Sugar pool (pool 2 → Karachi)
INSERT INTO shipments
  (id, pool_id, supplier_id, courier, tracking_number, status,
   origin_city, destination_city, pickup_address, notes,
   estimated_delivery, booked_at, picked_up_at, delivered_at,
   created_at, updated_at)
VALUES (
  'g1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000002',  -- Sugar pool
  'a1000000-0000-0000-0000-000000000006',  -- Prime Supplies (Karachi supplier)
  'tcs', 'TCS-STAGE-20240001', 'delivered',
  'Karachi', 'Karachi',
  'Prime Supplies Warehouse, SITE Area, Karachi',
  'Fragile – refined sugar in sealed bags',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '4 days',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '1 day'
) ON CONFLICT DO NOTHING;

-- ── Shipment Events (Tracking Timeline) ──────────────────────────────────────
INSERT INTO shipment_events
  (id, shipment_id, status, location, description, occurred_at)
VALUES
  (
    'se000000-0000-0000-0000-000000000001',
    'g1000000-0000-0000-0000-000000000001',
    'booked',
    'Karachi – SITE Area Warehouse',
    'Shipment booked with TCS. Tracking: TCS-STAGE-20240001',
    NOW() - INTERVAL '5 days'
  ),
  (
    'se000000-0000-0000-0000-000000000002',
    'g1000000-0000-0000-0000-000000000001',
    'picked_up',
    'Karachi – SITE Area Warehouse',
    'Parcel picked up by TCS courier.',
    NOW() - INTERVAL '4 days'
  ),
  (
    'se000000-0000-0000-0000-000000000003',
    'g1000000-0000-0000-0000-000000000001',
    'in_transit',
    'TCS Karachi Hub',
    'Package sorted and in transit to delivery zone.',
    NOW() - INTERVAL '3 days'
  ),
  (
    'se000000-0000-0000-0000-000000000004',
    'g1000000-0000-0000-0000-000000000001',
    'out_for_delivery',
    'Gulshan-e-Iqbal, Karachi',
    'Out for delivery. Driver: Amir Hussain.',
    NOW() - INTERVAL '1 day' - INTERVAL '4 hours'
  ),
  (
    'se000000-0000-0000-0000-000000000005',
    'g1000000-0000-0000-0000-000000000001',
    'delivered',
    'Gulshan-e-Iqbal, Karachi',
    'Delivered successfully. Received by: Sara Khan.',
    NOW() - INTERVAL '1 day'
  )
ON CONFLICT DO NOTHING;

-- ── Delivery Proof ────────────────────────────────────────────────────────────
INSERT INTO delivery_proofs
  (id, shipment_id, photo_url, notes, received_by, confirmed_at)
VALUES (
  'dp000000-0000-0000-0000-000000000001',
  'g1000000-0000-0000-0000-000000000001',
  'https://cdn.sahulat.pk/staging/proofs/TCS-STAGE-20240001.jpg',
  'All bags intact. Sugar quality verified.',
  'Sara Khan',
  NOW() - INTERVAL '1 day'
) ON CONFLICT (shipment_id) DO NOTHING;

-- ── Shipment Members ──────────────────────────────────────────────────────────
DO $$
DECLARE
  v_member1_id UUID;
  v_member2_id UUID;
BEGIN
  SELECT id INTO v_member1_id
    FROM pool_members
   WHERE pool_id = 'd1000000-0000-0000-0000-000000000002'
     AND buyer_id = 'a1000000-0000-0000-0000-000000000002';  -- Sara Khan

  SELECT id INTO v_member2_id
    FROM pool_members
   WHERE pool_id = 'd1000000-0000-0000-0000-000000000002'
     AND buyer_id = 'a1000000-0000-0000-0000-000000000004';  -- Zara Ahmed

  IF v_member1_id IS NOT NULL THEN
    INSERT INTO shipment_members
      (shipment_id, pool_member_id, buyer_id, quantity, delivery_address, sub_status, delivered_at)
    VALUES (
      'g1000000-0000-0000-0000-000000000001',
      v_member1_id,
      'a1000000-0000-0000-0000-000000000002',
      80,
      'House 12-B, Block 6, Gulshan-e-Iqbal, Karachi',
      'delivered',
      NOW() - INTERVAL '1 day'
    ) ON CONFLICT (shipment_id, pool_member_id) DO NOTHING;
  END IF;

  IF v_member2_id IS NOT NULL THEN
    INSERT INTO shipment_members
      (shipment_id, pool_member_id, buyer_id, quantity, delivery_address, sub_status, delivered_at)
    VALUES (
      'g1000000-0000-0000-0000-000000000001',
      v_member2_id,
      'a1000000-0000-0000-0000-000000000004',
      220,
      'Flat 3, Saima Royal Residency, Gulshan-e-Iqbal, Karachi',
      'delivered',
      NOW() - INTERVAL '1 day'
    ) ON CONFLICT (shipment_id, pool_member_id) DO NOTHING;
  END IF;
END
$$;


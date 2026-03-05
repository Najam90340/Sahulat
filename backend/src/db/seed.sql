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

-- ── Sample Shipments (for confirmed Sugar pool d1000000-0000-0000-0000-000000000002) ──

INSERT INTO shipments (id, pool_id, supplier_id, courier, tracking_number, status,
                       origin_city, destination_city, pickup_address, notes,
                       estimated_delivery, booked_at, picked_up_at)
VALUES (
  'g1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000005',
  'tcs',
  'TCS-2024-001234',
  'in_transit',
  'Lahore',
  'Karachi',
  'Global Goods Warehouse, Gulberg III, Lahore',
  'Handle with care. Consolidated shipment for pool buyers.',
  NOW() + INTERVAL '3 days',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '1 day'
) ON CONFLICT DO NOTHING;

-- Tracking events for the above shipment
INSERT INTO shipment_events (shipment_id, status, location, description, occurred_at)
VALUES
  ('g1000000-0000-0000-0000-000000000001', 'booked',    'Lahore',  'Shipment booked with TCS. Tracking: TCS-2024-001234', NOW() - INTERVAL '2 days'),
  ('g1000000-0000-0000-0000-000000000001', 'picked_up', 'Lahore',  'Parcel picked up from supplier warehouse.',           NOW() - INTERVAL '1 day 18 hours'),
  ('g1000000-0000-0000-0000-000000000001', 'in_transit', 'Lahore Hub', 'Arrived at Lahore sorting hub.',                 NOW() - INTERVAL '1 day 12 hours'),
  ('g1000000-0000-0000-0000-000000000001', 'in_transit', 'Multan Hub', 'In transit via Multan hub.',                     NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- Shipment members (linked to pool members of Sugar pool)
INSERT INTO shipment_members (shipment_id, pool_member_id, buyer_id, quantity, delivery_address, sub_status)
SELECT
  'g1000000-0000-0000-0000-000000000001',
  pm.id,
  pm.buyer_id,
  pm.quantity,
  CASE pm.buyer_id
    WHEN 'a1000000-0000-0000-0000-000000000002' THEN 'House 12, Block C, North Nazimabad, Karachi'
    WHEN 'a1000000-0000-0000-0000-000000000004' THEN 'Shop 45, Liberty Market Area, Lahore'
  END,
  'in_transit'
FROM pool_members pm
WHERE pm.pool_id = 'd1000000-0000-0000-0000-000000000002'
ON CONFLICT (shipment_id, pool_member_id) DO NOTHING;

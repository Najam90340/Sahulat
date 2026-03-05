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

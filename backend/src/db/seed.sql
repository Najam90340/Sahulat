-- Sample Users (buyers and suppliers)
INSERT INTO users (id, name, email, phone, role, city) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Ali Raza',     'ali@example.com',    '0300-1234567', 'buyer',    'Lahore'),
  ('a1000000-0000-0000-0000-000000000002', 'Sara Khan',    'sara@example.com',   '0301-2345678', 'buyer',    'Karachi'),
  ('a1000000-0000-0000-0000-000000000003', 'Usman Malik',  'usman@example.com',  '0302-3456789', 'buyer',    'Islamabad'),
  ('a1000000-0000-0000-0000-000000000004', 'Zara Ahmed',   'zara@example.com',   '0303-4567890', 'buyer',    'Lahore'),
  ('a1000000-0000-0000-0000-000000000005', 'Global Goods', 'supplier@global.pk', '0321-9999999', 'supplier', 'Lahore')
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

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users (buyers and suppliers)
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  phone       VARCHAR(30),
  role        VARCHAR(20) NOT NULL DEFAULT 'buyer',  -- 'buyer' | 'supplier' | 'admin'
  city        VARCHAR(100),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Products catalogue (managed by admins / suppliers)
CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  category    VARCHAR(100),
  description TEXT,
  unit        VARCHAR(50) DEFAULT 'units',
  moq         INTEGER NOT NULL DEFAULT 100,   -- Minimum Order Quantity set by supplier
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RFQs (Request for Quotes) posted by buyers
CREATE TABLE IF NOT EXISTS rfqs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  city         VARCHAR(100) NOT NULL,
  description  TEXT,
  status       VARCHAR(20) NOT NULL DEFAULT 'open',  -- 'open' | 'pooled' | 'confirmed' | 'cancelled'
  images       TEXT[] DEFAULT '{}',                  -- array of image URLs / paths
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Buying pools (created when buyer quantity < supplier MOQ)
CREATE TABLE IF NOT EXISTS pools (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id            UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  creator_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_name      VARCHAR(255) NOT NULL,
  city              VARCHAR(100) NOT NULL,
  moq               INTEGER NOT NULL CHECK (moq > 0),           -- target quantity to unlock
  current_quantity  INTEGER NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
  status            VARCHAR(20) NOT NULL DEFAULT 'open',         -- 'open' | 'confirmed' | 'refunded' | 'partial'
  deadline          TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Pool members (buyers who joined a pool)
CREATE TABLE IF NOT EXISTS pool_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id     UUID NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  buyer_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending' | 'confirmed' | 'refunded'
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  -- Unique per (pool, buyer) so that a buyer can update their quantity via ON CONFLICT upsert
  UNIQUE (pool_id, buyer_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rfqs_buyer_id     ON rfqs(buyer_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_status        ON rfqs(status);
CREATE INDEX IF NOT EXISTS idx_pools_rfq_id       ON pools(rfq_id);
CREATE INDEX IF NOT EXISTS idx_pools_status        ON pools(status);
CREATE INDEX IF NOT EXISTS idx_pool_members_pool   ON pool_members(pool_id);
CREATE INDEX IF NOT EXISTS idx_pool_members_buyer  ON pool_members(buyer_id);

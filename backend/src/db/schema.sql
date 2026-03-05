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

-- Supplier verification status on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending';

-- Quotes submitted by suppliers in response to RFQs / pools
CREATE TABLE IF NOT EXISTS quotes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id          UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  supplier_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  price_per_unit  NUMERIC(12, 2) NOT NULL CHECK (price_per_unit > 0),
  lead_time_days  INTEGER NOT NULL CHECK (lead_time_days > 0),
  notes           TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted' | 'rejected'
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (rfq_id, supplier_id)
);

-- Supplier product catalog with MOQ rules
CREATE TABLE IF NOT EXISTS catalog_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  category     VARCHAR(100),
  description  TEXT,
  unit         VARCHAR(50) DEFAULT 'units',
  moq          INTEGER NOT NULL DEFAULT 100 CHECK (moq > 0),
  price        NUMERIC(12, 2) CHECK (price > 0),
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rfqs_buyer_id        ON rfqs(buyer_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_status           ON rfqs(status);
CREATE INDEX IF NOT EXISTS idx_pools_rfq_id          ON pools(rfq_id);
CREATE INDEX IF NOT EXISTS idx_pools_status           ON pools(status);
CREATE INDEX IF NOT EXISTS idx_pool_members_pool      ON pool_members(pool_id);
CREATE INDEX IF NOT EXISTS idx_pool_members_buyer     ON pool_members(buyer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_rfq_id          ON quotes(rfq_id);
CREATE INDEX IF NOT EXISTS idx_quotes_supplier_id     ON quotes(supplier_id);
CREATE INDEX IF NOT EXISTS idx_catalog_supplier_id    ON catalog_items(supplier_id);

-- ── Escrow / Payments ───────────────────────────────────────────────────────

-- Transactions: one record per buyer per pool payment
CREATE TABLE IF NOT EXISTS transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id         UUID NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  pool_member_id  UUID NOT NULL REFERENCES pool_members(id) ON DELETE CASCADE,
  buyer_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount          NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency        VARCHAR(10) NOT NULL DEFAULT 'PKR',
  payment_method  VARCHAR(30) NOT NULL,   -- 'easypaisa' | 'jazzcash' | 'bank_transfer' | 'card'
  gateway_ref     VARCHAR(255),           -- external transaction ID returned by the payment gateway
  status          VARCHAR(20) NOT NULL DEFAULT 'initiated',
  -- 'initiated' | 'held' | 'released' | 'refunded' | 'failed'
  phone           VARCHAR(30),            -- for Easypaisa / JazzCash mobile wallet
  initiated_at    TIMESTAMPTZ DEFAULT NOW(),
  held_at         TIMESTAMPTZ,
  released_at     TIMESTAMPTZ,
  refunded_at     TIMESTAMPTZ,
  metadata        JSONB DEFAULT '{}',     -- gateway-specific payload (never store raw card data)
  UNIQUE (pool_member_id)                 -- one transaction per pool_member slot
);

CREATE INDEX IF NOT EXISTS idx_transactions_pool_id   ON transactions(pool_id);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_id  ON transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status    ON transactions(status);

-- ── Logistics / Shipment Tracking ──────────────────────────────────────────

-- Shipments: one consolidated shipment per confirmed pool (supplier → all buyers)
CREATE TABLE IF NOT EXISTS shipments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id         UUID NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  supplier_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  courier         VARCHAR(100) NOT NULL,   -- 'tcs' | 'leopards' | 'postex' | 'mp' | 'rider' | 'dhl' | 'other'
  tracking_number VARCHAR(255),            -- courier-assigned tracking number
  status          VARCHAR(30) NOT NULL DEFAULT 'pending',
  -- 'pending' | 'booked' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed'
  origin_city     VARCHAR(100) NOT NULL,
  destination_city VARCHAR(100) NOT NULL,
  pickup_address  TEXT,
  notes           TEXT,
  estimated_delivery TIMESTAMPTZ,
  booked_at       TIMESTAMPTZ,
  picked_up_at    TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Shipment events: immutable tracking timeline (append-only)
CREATE TABLE IF NOT EXISTS shipment_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id  UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  status       VARCHAR(30) NOT NULL,      -- same set as shipments.status
  location     VARCHAR(255),              -- city / hub where event occurred
  description  TEXT NOT NULL,
  occurred_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Delivery proofs: photo URL + notes per shipment, captured on final delivery
CREATE TABLE IF NOT EXISTS delivery_proofs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id  UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  photo_url    TEXT,                      -- URL to proof-of-delivery image
  notes        TEXT,
  received_by  VARCHAR(255),             -- name of person who accepted delivery
  confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (shipment_id)
);

-- Shipment members: maps each pool member's individual delivery details
-- Used for split / consolidated shipments where each buyer gets their share
CREATE TABLE IF NOT EXISTS shipment_members (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id    UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  pool_member_id UUID NOT NULL REFERENCES pool_members(id) ON DELETE CASCADE,
  buyer_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quantity       INTEGER NOT NULL CHECK (quantity > 0),
  delivery_address TEXT,
  sub_status     VARCHAR(30) NOT NULL DEFAULT 'pending',
  -- 'pending' | 'in_transit' | 'delivered' | 'failed'
  delivered_at   TIMESTAMPTZ,
  UNIQUE (shipment_id, pool_member_id)
);

CREATE INDEX IF NOT EXISTS idx_shipments_pool_id      ON shipments(pool_id);
CREATE INDEX IF NOT EXISTS idx_shipments_supplier_id  ON shipments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status       ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipment_events_ship   ON shipment_events(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_members_ship  ON shipment_members(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_members_buyer ON shipment_members(buyer_id);

-- ── In-App Messaging ──────────────────────────────────────────────────────────

-- Conversations: one thread per (buyer, supplier, rfq) tuple
CREATE TABLE IF NOT EXISTS conversations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supplier_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rfq_id       UUID REFERENCES rfqs(id) ON DELETE SET NULL,
  pool_id      UUID REFERENCES pools(id) ON DELETE SET NULL,
  subject      VARCHAR(255),           -- short label shown in inbox
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (buyer_id, supplier_id, rfq_id)  -- one thread per context
);

-- Messages within a conversation
CREATE TABLE IF NOT EXISTS messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_role      VARCHAR(20) NOT NULL,  -- 'buyer' | 'supplier' | 'admin'
  type             VARCHAR(20) NOT NULL DEFAULT 'text',
  -- 'text' | 'image' | 'voice' | 'system'
  body             TEXT,                  -- text content (contact-masked before storage)
  body_ur          TEXT,                  -- Urdu translation (optional, populated on request)
  attachment_url   TEXT,                  -- URL for image / voice attachment
  attachment_type  VARCHAR(30),           -- 'image/jpeg' | 'image/png' | 'audio/ogg' | etc.
  is_read          BOOLEAN NOT NULL DEFAULT FALSE,
  is_masked        BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE if contact info was stripped
  sent_at          TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_buyer    ON conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_supplier ON conversations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_conversations_rfq      ON conversations(rfq_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation  ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender        ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at       ON messages(sent_at);

-- ── Admin Panel: Dispute Resolution ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS disputes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  UUID REFERENCES transactions(id) ON DELETE SET NULL,
  buyer_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supplier_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pool_id         UUID REFERENCES pools(id) ON DELETE SET NULL,
  reason          TEXT NOT NULL,
  evidence_urls   TEXT[] DEFAULT '{}',
  status          VARCHAR(20) NOT NULL DEFAULT 'open',
  -- 'open' | 'investigating' | 'resolved_buyer' | 'resolved_supplier' | 'rejected'
  resolution      TEXT,
  admin_note      TEXT,
  raised_by       VARCHAR(10) NOT NULL DEFAULT 'buyer',  -- 'buyer' | 'supplier'
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_disputes_buyer    ON disputes(buyer_id);
CREATE INDEX IF NOT EXISTS idx_disputes_supplier ON disputes(supplier_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status   ON disputes(status);

-- ── Admin Panel: Supplier Subscriptions ──────────────────────────────────────

CREATE TYPE IF NOT EXISTS subscription_plan AS ENUM ('basic', 'pro', 'enterprise');

CREATE TABLE IF NOT EXISTS subscriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan         subscription_plan NOT NULL DEFAULT 'basic',
  status       VARCHAR(20) NOT NULL DEFAULT 'active',  -- 'active' | 'expired' | 'cancelled'
  amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency     VARCHAR(5) NOT NULL DEFAULT 'PKR',
  starts_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_supplier ON subscriptions(supplier_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status   ON subscriptions(status);

-- ── Admin Panel: Promotions / Promo Codes ────────────────────────────────────

CREATE TABLE IF NOT EXISTS promotions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(50) NOT NULL UNIQUE,
  description   TEXT,
  type          VARCHAR(20) NOT NULL DEFAULT 'percentage', -- 'percentage' | 'fixed'
  value         NUMERIC(10,2) NOT NULL,
  min_order     NUMERIC(12,2) DEFAULT 0,
  max_discount  NUMERIC(12,2),     -- cap for percentage promos
  max_uses      INTEGER,           -- NULL = unlimited
  uses_count    INTEGER NOT NULL DEFAULT 0,
  valid_from    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to      TIMESTAMPTZ,       -- NULL = no expiry
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  target_role   VARCHAR(20),       -- NULL = all, or 'buyer' | 'supplier'
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotions_code   ON promotions(code);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active);

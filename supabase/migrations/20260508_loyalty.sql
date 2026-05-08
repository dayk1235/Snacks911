-- Migration: loyalty_accounts + loyalty_transactions tables
-- Run once against your Supabase project.

-- ── loyalty_accounts ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS loyalty_accounts (
  customer_id      TEXT          PRIMARY KEY,
  total_points     INTEGER       NOT NULL DEFAULT 0,
  redeemed_points  INTEGER       NOT NULL DEFAULT 0,
  total_orders     INTEGER       NOT NULL DEFAULT 0,
  level            TEXT          NOT NULL DEFAULT 'nuevo'
                                  CHECK (level IN ('nuevo','regular','frecuente','vip')),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Index for level-based analytics queries
CREATE INDEX IF NOT EXISTS loyalty_accounts_level_idx
  ON loyalty_accounts (level);

-- RLS
ALTER TABLE loyalty_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON loyalty_accounts
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── loyalty_transactions ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   TEXT          NOT NULL,
  order_id      TEXT          NOT NULL,
  points_delta  INTEGER       NOT NULL,   -- positive = earned, negative = redeemed
  reason        TEXT          NOT NULL    -- 'order_paid' | 'redemption' | 'adjustment'
                                          CHECK (reason IN ('order_paid','redemption','adjustment')),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Idempotency index: one 'order_paid' transaction per order per customer
CREATE UNIQUE INDEX IF NOT EXISTS loyalty_tx_order_paid_idx
  ON loyalty_transactions (customer_id, order_id, reason)
  WHERE reason = 'order_paid';

-- Index for per-customer history
CREATE INDEX IF NOT EXISTS loyalty_tx_customer_idx
  ON loyalty_transactions (customer_id, created_at DESC);

-- FK to loyalty_accounts (soft — no hard FK to allow flexibility)
CREATE INDEX IF NOT EXISTS loyalty_tx_order_idx
  ON loyalty_transactions (order_id);

-- RLS
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON loyalty_transactions
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── Extend orders table ──────────────────────────────────────────────────────

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='loyalty_points_redeemed') THEN
    ALTER TABLE orders ADD COLUMN loyalty_points_redeemed INTEGER DEFAULT 0;
  END IF;
END $$;

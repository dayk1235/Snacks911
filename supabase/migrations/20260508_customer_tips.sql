-- Migration: create customer_tips table
-- Run once against your Supabase project.
-- Stores all tip decisions (including declines and pending asks).

CREATE TABLE IF NOT EXISTS customer_tips (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  TEXT        NOT NULL,
  order_id     UUID        NOT NULL,
  tip_amount   NUMERIC(10,2) NOT NULL,   -- -1 = asked but not yet answered, 0 = declined, >0 = accepted
  order_total  NUMERIC(10,2) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: one tip record per order (enforces ask-once)
CREATE UNIQUE INDEX IF NOT EXISTS customer_tips_order_id_idx
  ON customer_tips (order_id);

-- Index for per-customer history (used for lastTipAmount lookups in the future)
CREATE INDEX IF NOT EXISTS customer_tips_customer_id_idx
  ON customer_tips (customer_id, created_at DESC);

-- RLS: only service-role (admin) can read/write
ALTER TABLE customer_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON customer_tips
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

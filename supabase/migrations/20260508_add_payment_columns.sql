-- ============================================================
-- Snacks 911 — Payment columns for orders (Conekta)
-- Tracks: conekta_order_id, payment_url, payment_url_expires_at, paid_at, payment_status
-- ============================================================

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS conekta_order_id TEXT;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_url TEXT;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_url_expires_at TIMESTAMPTZ;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_orders_conekta_order_id
    ON orders (conekta_order_id);

CREATE INDEX IF NOT EXISTS idx_orders_payment_status
    ON orders (payment_status);

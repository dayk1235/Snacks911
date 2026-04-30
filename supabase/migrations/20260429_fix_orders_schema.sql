-- ============================================================
-- Snacks 911 — Fix Orders Schema (Revised)
-- This migration updates the orders table to support the new 
-- lowercase status values and ensures the 'channel' column exists.
-- ============================================================

-- 1. Ensure 'channel' column exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='channel') THEN
        ALTER TABLE orders ADD COLUMN channel text DEFAULT 'WEB';
    END IF;
END $$;

-- 2. Update status check constraint to include new lowercase statuses
-- We drop the old one first to avoid conflicts
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'preparing', 'ready', 'delivered', 'cancelled', 'DRAFT', 'CONFIRMED', 'CANCELLED'));

-- 3. Update channel check constraint to include WHATSAPP, WEB, POS, CHATBOT
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_channel_check;
ALTER TABLE orders ADD CONSTRAINT orders_channel_check 
  CHECK (channel IN ('WHATSAPP', 'WEB', 'POS', 'CHATBOT'));

-- 4. Ensure order_items has product_name column for easier viewing in panels
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='product_name') THEN
        ALTER TABLE order_items ADD COLUMN product_name text;
    END IF;
END $$;

-- 5. Ensure created_at is timestamptz for accurate tracking
ALTER TABLE orders ALTER COLUMN created_at TYPE timestamptz USING created_at::timestamptz;

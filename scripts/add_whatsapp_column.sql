-- WhatsApp Confirmation Tracking
-- Run in Supabase SQL Editor to add the column

-- Add column (safe, won't error if exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='whatsapp_confirmed') THEN
    ALTER TABLE orders ADD COLUMN whatsapp_confirmed BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Index for filtering unconfirmed orders
CREATE INDEX IF NOT EXISTS idx_orders_whatsapp_pending ON orders (whatsapp_confirmed) WHERE whatsapp_confirmed = FALSE;

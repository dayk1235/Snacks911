-- Add whatsapp_confirmed column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS whatsapp_confirmed BOOLEAN DEFAULT FALSE;

-- Add index for filtering unconfirmed orders
CREATE INDEX IF NOT EXISTS idx_orders_whatsapp_pending ON orders (whatsapp_confirmed) WHERE whatsapp_confirmed = FALSE;

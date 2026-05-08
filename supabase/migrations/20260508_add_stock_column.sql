-- ============================================================
-- Snacks 911 — stock column + transactional order processing
-- Supports: dbSaveOrder transaction (FOR UPDATE) and inventoryFilter
-- Default 999 = effectively unlimited stock for snack-type business
-- ============================================================

ALTER TABLE products
ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 999;

COMMENT ON COLUMN products.stock IS 'Remaining inventory. Default 999 = unlimited. Used in transactional order flow with FOR UPDATE to prevent race conditions.';

-- Transactional order processing: checks stock, deducts, inserts
-- Called via supabase.rpc('process_order', { ... })
CREATE OR REPLACE FUNCTION process_order(
  p_order_id         UUID,
  p_channel          TEXT,
  p_total            NUMERIC,
  p_customer_name    TEXT,
  p_customer_phone   TEXT,
  p_notes            TEXT,
  p_whatsapp_confirmed BOOLEAN,
  p_items            JSONB
) RETURNS UUID AS $$
DECLARE
  item_record  JSONB;
  v_product_id TEXT;
  v_qty        INTEGER;
  v_stock      INTEGER;
  v_product_name TEXT;
  v_price      NUMERIC;
BEGIN
  -- Validate each item stock WITH row-level lock (prevents race conditions)
  FOR item_record IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := item_record->>'productId';
    v_qty        := (item_record->>'quantity')::INTEGER;
    v_product_name := item_record->>'productName';
    v_price      := (item_record->>'price')::NUMERIC;

    -- Lock row for this product so concurrent transactions wait
    SELECT products.stock INTO v_stock
    FROM products
    WHERE products.id = v_product_id::TEXT
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'OUT_OF_STOCK: Product % not found', v_product_id;
    END IF;

    IF v_stock < v_qty THEN
      RAISE EXCEPTION 'OUT_OF_STOCK: Insufficient stock for product % (have %, need %)',
        v_product_name, v_stock, v_qty;
    END IF;

    -- Deduct stock
    UPDATE products
    SET stock = stock - v_qty
    WHERE products.id = v_product_id::TEXT;
  END LOOP;

  -- Insert order
  INSERT INTO orders (
    id, status, channel, total, created_at,
    customer_name, customer_phone, notes, whatsapp_confirmed
  ) VALUES (
    p_order_id, 'pending', p_channel, p_total, now(),
    p_customer_name, p_customer_phone, p_notes, p_whatsapp_confirmed
  );

  -- Insert order items
  FOR item_record IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := item_record->>'productId';
    v_qty        := (item_record->>'quantity')::INTEGER;
    v_product_name := item_record->>'productName';
    v_price      := (item_record->>'price')::NUMERIC;

    INSERT INTO order_items (
      order_id, product_id, product_name, quantity, price
    ) VALUES (
      p_order_id, v_product_id::TEXT, v_product_name, v_qty, v_price
    );
  END LOOP;

  RETURN p_order_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Snacks 911 — Bot DB Schema Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Extend products table (add bot-specific columns if not exist)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS requires_sauce boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_best_seller boolean DEFAULT false;

-- 2. Combo items (what each combo includes)
-- Uses products table as reference (products.id is uuid)
CREATE TABLE IF NOT EXISTS combo_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  item_product_id uuid REFERENCES products(id),
  qty integer DEFAULT 1,
  notes text
);

-- 3. Modifiers (sauces, dips, extras)
CREATE TABLE IF NOT EXISTS modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('SAUCE','DIP','EXTRA')),
  name text NOT NULL,
  price numeric(10,2) DEFAULT 0,
  is_active boolean DEFAULT true
);

-- 4. Which products need which modifiers
CREATE TABLE IF NOT EXISTS product_modifier_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  modifier_type text NOT NULL CHECK (modifier_type IN ('SAUCE','DIP')),
  is_required boolean DEFAULT false,
  max_select integer DEFAULT 1,
  included_count integer DEFAULT 1
);

-- 5. Announcements (real-time store alerts)
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean DEFAULT true
);

-- 6. FAQ (key-value for bot answers)
CREATE TABLE IF NOT EXISTS faqs (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- 7. Orders (unified: web, whatsapp, pos)
-- Note: If orders table already exists with different schema, this will be skipped
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'orders') THEN
        CREATE TABLE orders (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          channel text DEFAULT 'WHATSAPP' CHECK (channel IN ('WHATSAPP','WEB','POS')),
          status text DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','CONFIRMED','CANCELLED')),
          customer_name text,
          customer_phone text,
          delivery_type text CHECK (delivery_type IN ('PICKUP','DELIVERY')),
          address text,
          payment_method text CHECK (payment_method IN ('CASH','CARD','TRANSFER')),
          total numeric(10,2),
          created_at timestamptz DEFAULT now()
        );
    END IF;
END $$;

-- 8. Order line items
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  qty integer NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  selected_modifiers_json jsonb DEFAULT '[]'::jsonb
);

-- 9. WhatsApp bot sessions (cart + state per user)
CREATE TABLE IF NOT EXISTS wa_sessions (
  phone_number text PRIMARY KEY,
  state text NOT NULL DEFAULT 'S0_IDLE',
  cart_data jsonb DEFAULT '[]'::jsonb,
  unknown_count integer DEFAULT 0,
  last_interaction timestamptz DEFAULT now()
);

-- 10. Conversion events (KPI logging)
CREATE TABLE IF NOT EXISTS wa_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text,
  event_type text NOT NULL, -- order_started|upsell_accepted|upsell_rejected|handoff|order_completed
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Modifiers (salsas, dips)
INSERT INTO modifiers (type, name, price, is_active) VALUES
  ('SAUCE', 'BBQ', 0, true),
  ('SAUCE', 'Mango Habanero', 0, true),
  ('SAUCE', 'Salsa extra', 12, true),
  ('DIP', 'Dip Parmesano', 15, true),
  ('DIP', 'Dip Queso Cheddar', 15, true)
ON CONFLICT DO NOTHING;

-- FAQs
INSERT INTO faqs (key, value) VALUES
  ('HOURS', 'Abrimos de Lunes a Domingo de 1pm a 10pm.'),
  ('LOCATION', 'Estamos en [TU DIRECCIÓN AQUÍ]. Búscanos en Google Maps como Snacks 911.'),
  ('PAYMENTS', 'Aceptamos efectivo, tarjeta y transferencia bancaria.'),
  ('DELIVERY', 'Hacemos entrega en zona local. El costo de envío varía según distancia. Consulta disponibilidad.')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
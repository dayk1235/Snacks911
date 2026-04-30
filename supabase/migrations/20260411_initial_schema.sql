-- ============================================================
-- Snacks 911 — Initial Schema + RLS + Indexes
-- Supabase/Postgres Best Practices Applied
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. TABLES WITH PROPER CONSTRAINTS
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS products (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text NOT NULL,
    price      numeric(10, 2) NOT NULL CHECK (price >= 0),
    delivery_price numeric(10, 2),
    category   text NOT NULL,
    is_available  boolean NOT NULL DEFAULT true,
    description text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS orders (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    status         text NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'preparing', 'ready', 'delivered', 'cancelled')),
    total          numeric(10, 2) NOT NULL CHECK (total >= 0),
    customer_name  text NOT NULL DEFAULT '',
    customer_phone text NOT NULL DEFAULT '',
    notes          text NOT NULL DEFAULT '',
    handled_by     text NOT NULL DEFAULT '',
    created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id     uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id   text NOT NULL,
    product_name text NOT NULL,
    quantity     integer NOT NULL CHECK (quantity > 0),
    price        numeric(10, 2) NOT NULL CHECK (price >= 0)
);

CREATE TABLE IF NOT EXISTS customers (
    phone_number    text PRIMARY KEY,
    name            text NOT NULL DEFAULT '',
    total_orders    integer NOT NULL DEFAULT 0 CHECK (total_orders >= 0),
    last_order_date timestamptz,
    last_order_total numeric(10, 2) DEFAULT 0,
    favorite_product text NOT NULL DEFAULT '',
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS custom_categories (
    id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    label text NOT NULL,
    emoji text NOT NULL DEFAULT ''
);

-- Single-row constraint on business_settings
CREATE TABLE IF NOT EXISTS business_settings (
    id               integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    prep_time        integer NOT NULL DEFAULT 25 CHECK (prep_time > 0),
    accepting_orders boolean NOT NULL DEFAULT true,
    whatsapp_number  text NOT NULL DEFAULT '525584507458',
    open_hours       jsonb NOT NULL DEFAULT '{}'::jsonb,
    business_name    text NOT NULL DEFAULT 'Snacks 911',
    address          text NOT NULL DEFAULT '',
    hero_badge_text  text NOT NULL DEFAULT 'Abierto ahora',
    hero_stats       jsonb NOT NULL DEFAULT '[]'::jsonb,
    delivery_apps    jsonb NOT NULL DEFAULT '[]'::jsonb,
    updated_at       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT single_row_check CHECK (id = 1)
);

-- Profiles table (for Supabase Auth integration)
CREATE TABLE IF NOT EXISTS profiles (
    id    uuid PRIMARY KEY,  -- references auth.users(id) when auth enabled
    email text NOT NULL,
    name  text NOT NULL DEFAULT '',
    role  text NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee'))
);

-- ──────────────────────────────────────────────────────────────
-- 2. INDEXES (Query Performance)
-- ──────────────────────────────────────────────────────────────

-- orders: most queried by status + created_at
CREATE INDEX idx_orders_status_created
    ON orders (status, created_at DESC);

-- orders: lookup by phone (customer history)
CREATE INDEX idx_orders_customer_phone
    ON orders (customer_phone);

-- order_items: FK index for join performance
CREATE INDEX idx_order_items_order_id
    ON order_items (order_id);

-- products: category filter
CREATE INDEX idx_products_category
    ON products (category);

-- customers: order count ranking
CREATE INDEX idx_customers_total_orders
    ON customers (total_orders DESC);

-- Partial index: only active orders (exclude delivered/cancelled)
CREATE INDEX idx_orders_active
    ON orders (id, status, created_at DESC)
    WHERE status IN ('pending', 'preparing', 'ready');

-- ──────────────────────────────────────────────────────────────
-- 3. TRIGGERS (updated_at auto-management)
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_business_settings_updated_at
    BEFORE UPDATE ON business_settings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- ──────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY (RLS)
-- ──────────────────────────────────────────────────────────────
--
-- NOTE: The frontend uses the Supabase anon key (no Supabase Auth).
-- All browser queries run as the `anon` role. RLS here provides
-- defense-in-depth and explicit policy documentation.
--
-- For true admin-only write access, migrate to Supabase Auth
-- and replace these policies with JWT-based `auth.jwt()` checks.
-- ──────────────────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE products              ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;

-- ── Products: public read, public write (migrate to JWT for admin-only) ──
CREATE POLICY products_read
    ON products FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY products_write
    ON products FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- ── Orders: anyone can insert (customer orders), anyone can read (admin KDS) ──
CREATE POLICY orders_read
    ON orders FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY orders_insert
    ON orders FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY orders_update
    ON orders FOR UPDATE
    TO anon, authenticated
    USING (true);

-- ── Order items: read + insert for order flow ──
CREATE POLICY order_items_read
    ON order_items FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY order_items_insert
    ON order_items FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY order_items_delete
    ON order_items FOR DELETE
    TO anon, authenticated
    USING (true);

-- ── Customers: read + write for CRM ──
CREATE POLICY customers_read
    ON customers FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY customers_write
    ON customers FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- ── Categories: public read/write ──
CREATE POLICY categories_read
    ON custom_categories FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY categories_write
    ON custom_categories FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- ── Business settings: public read, public write (single-row constrained) ──
CREATE POLICY settings_read
    ON business_settings FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY settings_write
    ON business_settings FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- ── Profiles: read for auth ──
CREATE POLICY profiles_read
    ON profiles FOR SELECT
    TO anon, authenticated
    USING (true);

-- ──────────────────────────────────────────────────────────────
-- 5. DATABASE FUNCTIONS (for operations JS can't do atomically)
-- ──────────────────────────────────────────────────────────────

-- Atomic toggle product availability (avoids read-then-write race)
CREATE OR REPLACE FUNCTION toggle_product_available(p_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
    UPDATE products SET is_available = NOT is_available
    WHERE id = p_id;
$$;

-- ──────────────────────────────────────────────────────────────
-- 6. SEED DATA
-- ──────────────────────────────────────────────────────────────

INSERT INTO business_settings (id, prep_time, accepting_orders, whatsapp_number)
VALUES (1, 25, true, '525584507458')
ON CONFLICT (id) DO NOTHING;

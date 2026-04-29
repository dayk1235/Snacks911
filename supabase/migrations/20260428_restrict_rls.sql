-- ============================================================
-- Snacks 911 — Strict RLS Enforcement
-- Migrates from open anon access to role-based access
-- ============================================================

-- 1. Helper function for role checking
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM employees
        WHERE employee_id = current_setting('app.current_employee_id', true)
        AND role = 'admin'
        AND active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_staff()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM employees
        WHERE employee_id = current_setting('app.current_employee_id', true)
        AND active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. PRODUCTS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_write ON products;
DROP POLICY IF EXISTS products_read ON products;
DROP POLICY IF EXISTS products_admin_all ON products;

-- Anyone can read products (to see the menu)
CREATE POLICY products_read ON products FOR SELECT USING (true);

-- Only Admin can insert/update/delete products
CREATE POLICY products_admin_insert ON products FOR INSERT
    TO authenticated
    WITH CHECK (is_admin());

CREATE POLICY products_admin_update ON products FOR UPDATE
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY products_admin_delete ON products FOR DELETE
    TO authenticated
    USING (is_admin());

-- 3. ORDERS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orders_read ON orders;
DROP POLICY IF EXISTS orders_insert ON orders;
DROP POLICY IF EXISTS orders_update ON orders;
DROP POLICY IF EXISTS orders_customer_insert ON orders;
DROP POLICY IF EXISTS orders_staff_read ON orders;
DROP POLICY IF EXISTS orders_staff_update ON orders;

-- Anyone can insert (customer checkout - public access)
CREATE POLICY orders_customer_insert ON orders FOR INSERT WITH CHECK (true);

-- Staff and Admin can read all orders
CREATE POLICY orders_staff_read ON orders FOR SELECT
    TO authenticated
    USING (is_staff());

-- Staff and Admin can update order status
CREATE POLICY orders_staff_update ON orders FOR UPDATE
    TO authenticated
    USING (is_staff())
    WITH CHECK (is_staff());

-- Prevent deletes (orders are never deleted, only cancelled)
CREATE POLICY orders_no_delete ON orders FOR DELETE
    USING (false);

-- 4. BUSINESS SETTINGS
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS settings_read ON business_settings;
DROP POLICY IF EXISTS settings_write ON business_settings;
DROP POLICY IF EXISTS settings_admin_update ON business_settings;

-- Anyone can read (to see open status/WA number)
CREATE POLICY settings_read ON business_settings FOR SELECT USING (true);

-- Only Admin can update settings
CREATE POLICY settings_admin_update ON business_settings FOR UPDATE
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- Prevent inserts and deletes (table should have single row)
CREATE POLICY settings_no_insert ON business_settings FOR INSERT WITH CHECK (false);
CREATE POLICY settings_no_delete ON business_settings FOR DELETE USING (false);

-- 5. CASH MANAGEMENT
DROP POLICY IF EXISTS cash_read ON cash_sessions;
DROP POLICY IF EXISTS cash_write ON cash_sessions;

-- Staff and Admin can manage cash
-- (Assuming tables exist from phase 2.2)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'cash_sessions') THEN
        ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS cash_sessions_staff_all ON cash_sessions;
        CREATE POLICY cash_sessions_staff_all ON cash_sessions FOR ALL
            TO authenticated
            USING (is_staff())
            WITH CHECK (is_staff());
    END IF;
END $$;

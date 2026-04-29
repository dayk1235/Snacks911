
🚀 Supabase Migration Deployment

==================================================

📋 Migrations to deploy:

  1. 20260428_audit_logs.sql
  2. 20260428_restrict_rls.sql

==================================================

⚙️  Option 1: Via Supabase CLI (Recommended)

Run the following command:
  supabase link
  supabase db push

==================================================

⚙️  Option 2: Manual SQL Execution

1. Go to: https://app.supabase.com/project/hhybfgqabjickxbuviyf/sql/new
2. Copy & paste the SQL below:
3. Click "Run" or Ctrl+Enter

==================================================

📄 SQL Migration (1/2) - Audit Logs

-- ============================================================
-- Snacks 911 — Automated Audit Logging System
-- Captures INSERT/UPDATE/DELETE on critical tables
-- ============================================================

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name  text NOT NULL,
    record_id   text NOT NULL,
    action      text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data    jsonb,
    new_data    jsonb,
    changed_by  text NOT NULL DEFAULT 'system',
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. Create audit trigger function
CREATE OR REPLACE FUNCTION process_audit_log()
RETURNS trigger AS $$
DECLARE
    v_user_id text;
    v_record_id text;
BEGIN
    -- Try to get employeeId from current session settings
    -- Set by the application before running queries
    BEGIN
        v_user_id := current_setting('app.current_employee_id', true);
    EXCEPTION WHEN OTHERS THEN
        v_user_id := 'system';
    END;

    -- Convert record_id to text (handle both uuid and integer)
    IF TG_OP = 'DELETE' THEN
        v_record_id := OLD.id::text;
        INSERT INTO audit_logs (table_name, record_id, action, old_data, changed_by)
        VALUES (TG_TABLE_NAME, v_record_id, TG_OP, to_jsonb(OLD), COALESCE(v_user_id, 'system'));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        v_record_id := NEW.id::text;
        INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
        VALUES (TG_TABLE_NAME, v_record_id, TG_OP, to_jsonb(OLD), to_jsonb(NEW), COALESCE(v_user_id, 'system'));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        v_record_id := NEW.id::text;
        INSERT INTO audit_logs (table_name, record_id, action, new_data, changed_by)
        VALUES (TG_TABLE_NAME, v_record_id, TG_OP, to_jsonb(NEW), COALESCE(v_user_id, 'system'));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach triggers to tables
-- Products
DROP TRIGGER IF EXISTS trg_audit_products ON products;
CREATE TRIGGER trg_audit_products
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- Orders
DROP TRIGGER IF EXISTS trg_audit_orders ON orders;
CREATE TRIGGER trg_audit_orders
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- Business Settings (supports integer id)
DROP TRIGGER IF EXISTS trg_audit_settings ON business_settings;
CREATE TRIGGER trg_audit_settings
    AFTER UPDATE ON business_settings
    FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- Employees
DROP TRIGGER IF EXISTS trg_audit_employees ON employees;
CREATE TRIGGER trg_audit_employees
    AFTER INSERT OR UPDATE OR DELETE ON employees
    FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- 4. RLS for audit_logs (Admin only read)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_read_admin
    ON audit_logs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE employee_id = current_setting('app.current_employee_id', true)
            AND role = 'admin'
            AND active = true
        )
    );

-- Prevent any unauthorized modifications (only triggers can insert)
CREATE POLICY audit_logs_no_insert
    ON audit_logs FOR INSERT
    WITH CHECK (false);

CREATE POLICY audit_logs_no_update
    ON audit_logs FOR UPDATE
    USING (false);

CREATE POLICY audit_logs_no_delete
    ON audit_logs FOR DELETE
    USING (false);


==================================================

📄 SQL Migration (2/2) - Restrict RLS

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


==================================================

✨ Migration deployment guide complete!



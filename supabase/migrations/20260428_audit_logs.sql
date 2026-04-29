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

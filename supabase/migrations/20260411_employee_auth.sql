-- ============================================================
-- Snacks 911 — Employee Authentication Migration
-- Replaces email-based auth with employeeId-based auth
-- ============================================================

-- ── 1. Reset existing auth data ──
DELETE FROM public.profiles;

-- ── 2. Create employees table ──
CREATE TABLE IF NOT EXISTS employees (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id    text NOT NULL UNIQUE,
    password_hash  text NOT NULL,
    password_salt  text NOT NULL,
    name           text NOT NULL DEFAULT '',
    role           text NOT NULL DEFAULT 'staff'
                       CHECK (role IN ('admin', 'staff')),
    active         boolean NOT NULL DEFAULT true,
    created_at     timestamptz NOT NULL DEFAULT now(),
    last_login_at  timestamptz
);

-- ── 3. Indexes ──
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_employee_id
    ON employees (employee_id);

CREATE INDEX IF NOT EXISTS idx_employees_active
    ON employees (active) WHERE active = true;

-- ── 4. Row Level Security ──
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- All authenticated sessions can read active employees
CREATE POLICY employees_read_active
    ON employees FOR SELECT
    USING (active = true);

-- Admin can manage all employees
CREATE POLICY employees_admin_manage
    ON employees FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM employees e2
            WHERE e2.employee_id = current_setting('app.admin_employee_id', true)
            AND e2.role = 'admin'
            AND e2.active = true
        )
    );

-- Note: Default admin is created by server-side initDefaultAdmin()
-- which uses service_role key to bypass RLS.
-- No bootstrap insert policy needed.

-- ============================================================
-- Snacks 911 — Event Log System (Phase 1.10.1)
-- Centralized event store for analytics and recovery
-- ============================================================

CREATE TABLE IF NOT EXISTS event_logs (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        text NOT NULL DEFAULT 'main',
    event_type       text NOT NULL,
    occurred_at      timestamptz NOT NULL DEFAULT now(),
    actor            text NOT NULL DEFAULT 'system',
    channel          text NOT NULL DEFAULT 'web',
    order_id         uuid,
    cart_id          uuid,
    customer_phone   text,
    session_id       text,
    idempotency_key  text UNIQUE,
    payload_json     jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Index for analytics and performance
CREATE INDEX IF NOT EXISTS idx_event_logs_type_occurred ON event_logs (event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_logs_customer ON event_logs (customer_phone);
CREATE INDEX IF NOT EXISTS idx_event_logs_cart ON event_logs (cart_id) WHERE cart_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_logs_order ON event_logs (order_id) WHERE order_id IS NOT NULL;

-- RLS (Admin only read)
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;

-- Select policy for admins
CREATE POLICY event_logs_read_admin
    ON event_logs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE employee_id = current_setting('app.current_employee_id', true)
            AND role = 'admin'
            AND active = true
        )
    );

-- Insert policy for everyone (anonymous/authenticated) - needed for bot/web events
CREATE POLICY event_logs_insert_public
    ON event_logs FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- No updates or deletes allowed (immutable log)
CREATE POLICY event_logs_no_update
    ON event_logs FOR UPDATE
    USING (false);

CREATE POLICY event_logs_no_delete
    ON event_logs FOR DELETE
    USING (false);

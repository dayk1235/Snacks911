-- Migration: create upsell_events table for conversion analytics
-- Run once against your Supabase project.

CREATE TABLE IF NOT EXISTS upsell_events (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  TEXT          NOT NULL,                         -- WhatsApp phone / session key
  rule_id     TEXT          NOT NULL,                         -- UpsellRuleId enum value
  accepted    BOOLEAN       NOT NULL,
  amount      NUMERIC(10,2) NOT NULL DEFAULT 0,               -- Upsell item price
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Index: per-session lookup (idempotency / history)
CREATE INDEX IF NOT EXISTS upsell_events_session_idx
  ON upsell_events (session_id, rule_id);

-- Index: analytics queries by date + rule
CREATE INDEX IF NOT EXISTS upsell_events_rule_date_idx
  ON upsell_events (rule_id, created_at DESC);

-- RLS: service_role only
ALTER TABLE upsell_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON upsell_events
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

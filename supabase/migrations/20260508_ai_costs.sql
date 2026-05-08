-- ============================================================
-- Snacks 911 — AI Cost Tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  tokens_input INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,
  cost FLOAT NOT NULL DEFAULT 0.0,
  intent TEXT,
  order_id UUID, -- Optional link to orders table
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_costs_user_id ON ai_costs(user_id);
CREATE INDEX idx_ai_costs_created_at ON ai_costs(created_at);

COMMENT ON TABLE ai_costs IS 'Operational metrics to track AI usage costs per conversation and intent.';

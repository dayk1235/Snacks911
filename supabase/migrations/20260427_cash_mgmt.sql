-- Phase 2.2: Cash Management tables

CREATE TABLE IF NOT EXISTS cash_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opened_at       timestamptz NOT NULL DEFAULT now(),
  closed_at       timestamptz,
  opening_amount  numeric(10,2) NOT NULL DEFAULT 0,
  closing_amount  numeric(10,2),
  expected_amount numeric(10,2),
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  opened_by       text NOT NULL DEFAULT '',
  notes           text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS cash_movements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES cash_sessions(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('IN','OUT')),
  amount      numeric(10,2) NOT NULL CHECK (amount > 0),
  concept     text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cash_sessions_status ON cash_sessions(status, opened_at DESC);
CREATE INDEX idx_cash_movements_session ON cash_movements(session_id);

-- RLS
ALTER TABLE cash_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY cash_sessions_all  ON cash_sessions  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY cash_movements_all ON cash_movements FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

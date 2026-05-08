-- ============================================================
-- Snacks 911 — Persistent System State for Self-Healing Engine
-- ============================================================

CREATE TABLE IF NOT EXISTS system_state (
  id TEXT PRIMARY KEY DEFAULT 'global',
  error_count INTEGER NOT NULL DEFAULT 0,
  last_error_at TIMESTAMPTZ,
  mode TEXT NOT NULL DEFAULT 'NORMAL',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure only one row exists
INSERT INTO system_state (id, error_count, mode)
VALUES ('global', 0, 'NORMAL')
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE system_state IS 'Persistent state for the AI Bot self-healing mechanism. Replaces file-based state for serverless compatibility.';

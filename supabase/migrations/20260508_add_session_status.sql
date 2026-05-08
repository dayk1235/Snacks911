-- ============================================================
-- Snacks 911 — session_status field for ai_logs
-- Tracks: ACTIVE | ABANDONED | COMPLETED
-- ============================================================

ALTER TABLE ai_logs
ADD COLUMN IF NOT EXISTS session_status TEXT DEFAULT 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_ai_logs_user_intent
    ON ai_logs (user_id, intent, created_at DESC);

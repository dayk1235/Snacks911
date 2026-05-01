-- ============================================================
-- Snacks 911 — WhatsApp Messages Dedup Table
-- Creates wa_messages table for DB-level message deduplication
-- ============================================================

CREATE TABLE IF NOT EXISTS wa_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_message_id text UNIQUE NOT NULL,
  phone_number text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type text DEFAULT 'text',
  content text,
  processed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookup by wa_message_id
CREATE INDEX IF NOT EXISTS idx_wa_messages_wa_id ON wa_messages(wa_message_id);

-- Index for cleanup old messages (optional, keep last 30 days)
CREATE INDEX IF NOT EXISTS idx_wa_messages_created ON wa_messages(created_at);

-- RLS: Allow service_role full access, anon can insert (for webhook)
ALTER TABLE wa_messages ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (bypasses RLS anyway)
-- Anon key can only insert (for webhook deduplication)
CREATE POLICY IF NOT EXISTS wa_messages_insert ON wa_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS wa_messages_select ON wa_messages
  FOR SELECT USING (true);

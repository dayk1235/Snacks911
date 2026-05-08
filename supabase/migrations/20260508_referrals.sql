-- Migration: Referral System for Snacks 911
-- Mechanics: Referrer ($30 credit), New Customer ($20 discount)

-- 1. referral_codes: Maps a customer to their unique sharing code
CREATE TABLE IF NOT EXISTS referral_codes (
  code TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  total_referrals INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id)
);

-- 2. referral_transactions: Tracks specific referral usage
CREATE TABLE IF NOT EXISTS referral_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL REFERENCES referral_codes(code),
  new_customer_id TEXT NOT NULL,
  order_id TEXT,
  discount_given INTEGER DEFAULT 20,
  credit_activated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(new_customer_id) -- Only one referral per new customer
);

-- 3. Indexing
CREATE INDEX IF NOT EXISTS referral_codes_customer_idx ON referral_codes(customer_id);
CREATE INDEX IF NOT EXISTS referral_tx_customer_idx ON referral_transactions(new_customer_id);

-- 4. Atomic Increment RPC
CREATE OR REPLACE FUNCTION increment_referral_count(p_code TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE referral_codes
  SET total_referrals = total_referrals + 1
  WHERE code = p_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

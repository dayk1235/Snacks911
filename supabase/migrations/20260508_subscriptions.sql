-- Migration: Subscription System Schema
-- Table: subscriptions

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('basic', 'pro')),
  status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
  
  -- Billing Cycle
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  
  -- External Provider Reference (Stripe/Conekta/etc)
  external_subscription_id TEXT UNIQUE,
  external_customer_id TEXT,
  
  -- Metadata
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance and lookup
CREATE INDEX IF NOT EXISTS subscriptions_tenant_id_idx ON subscriptions (tenant_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions (status);
CREATE INDEX IF NOT EXISTS subscriptions_external_id_idx ON subscriptions (external_subscription_id);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Multi-tenant Isolation Policy
CREATE POLICY "subscriptions_isolation" ON subscriptions
FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_subscription_timestamp
BEFORE UPDATE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION update_subscription_timestamp();

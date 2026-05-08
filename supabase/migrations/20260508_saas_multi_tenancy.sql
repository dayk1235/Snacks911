-- Migration: Multi-tenant SaaS Conversion
-- This migration converts a single-business platform into a scalable SaaS.

-- 1. Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  business_name TEXT NOT NULL,
  whatsapp_number TEXT UNIQUE NOT NULL, -- The number people message
  whatsapp_token TEXT, -- Bot account token
  logo_url TEXT,
  primary_color TEXT DEFAULT '#ef4444', -- Default red
  google_maps_url TEXT,
  business_hours JSONB,
  ai_personality TEXT,
  plan TEXT DEFAULT 'basic' CHECK (plan IN ('basic', 'pro', 'enterprise')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add tenant_id to core tables
-- Products
ALTER TABLE products ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
-- Orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
-- Loyalty
ALTER TABLE loyalty_accounts ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
-- Referrals
ALTER TABLE referral_codes ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
-- AI Logs (Conversations)
ALTER TABLE ai_logs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- 3. Create a Default Tenant for backward compatibility
-- We'll assume the current data belongs to "Snacks 911"
DO $$ 
DECLARE 
  default_tenant_id UUID;
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE slug = 'snacks911') THEN
    INSERT INTO tenants (slug, business_name, whatsapp_number, ai_personality)
    VALUES ('snacks911', 'Snacks 911', '525584507458', 'Eres un mesero experto en alitas y snacks, muy amable y eficiente.')
    RETURNING id INTO default_tenant_id;

    -- Assign existing data to this tenant
    UPDATE products SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    UPDATE orders SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    UPDATE loyalty_accounts SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    UPDATE referral_codes SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    UPDATE ai_logs SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  END IF;
END $$;

-- 4. Enable RLS (Row Level Security) - Summary
-- Every table should now have a policy like: 
-- CREATE POLICY "tenant_isolation" ON products USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
-- Note: Setting app.current_tenant_id should be done per request in the server.

-- Indexes for performance
CREATE INDEX IF NOT EXISTS products_tenant_idx ON products(tenant_id);
CREATE INDEX IF NOT EXISTS orders_tenant_idx ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS ai_logs_tenant_idx ON ai_logs(tenant_id);

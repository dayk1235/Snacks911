-- Migration: Multi-channel Communication Support
-- Objects: tenant_channels table

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'channel_type') THEN
    CREATE TYPE channel_type AS ENUM ('whatsapp', 'instagram', 'web', 'messenger');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS tenant_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type channel_type NOT NULL,
  
  -- Platform specific configuration (tokens, IDs, webhook secrets)
  config JSONB NOT NULL DEFAULT '{}',
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one config per channel type per tenant
  UNIQUE(tenant_id, type)
);

-- RLS
ALTER TABLE tenant_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_channels_isolation" ON tenant_channels
FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Example Queries:
/*
-- 1. Get WhatsApp config for a tenant
SELECT config FROM tenant_channels 
WHERE tenant_id = '...' AND type = 'whatsapp' AND active = true;

-- 2. Get all active channels for a tenant
SELECT type, config FROM tenant_channels 
WHERE tenant_id = '...' AND active = true;

-- 3. Upsert Instagram config
INSERT INTO tenant_channels (tenant_id, type, config)
VALUES ('...', 'instagram', '{"page_id": "123", "access_token": "abc"}')
ON CONFLICT (tenant_id, type) DO UPDATE SET config = EXCLUDED.config;
*/

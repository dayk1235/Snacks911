-- Migration: AI Configuration per Tenant
CREATE TABLE IF NOT EXISTS ai_configs (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Personality & Tone
  tone TEXT DEFAULT 'friendly' CHECK (tone IN ('friendly', 'formal', 'energetic', 'street')),
  personality_prompt TEXT NOT NULL,
  
  -- Sales Strategy
  upsell_strategy TEXT DEFAULT 'moderate' CHECK (upsell_strategy IN ('passive', 'moderate', 'aggressive')),
  max_upsell_suggestions INT DEFAULT 2,
  
  -- Safety & Compliance
  prohibited_topics TEXT[] DEFAULT '{}',
  safety_guardrails TEXT,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE ai_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_configs_isolation" ON ai_configs
FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

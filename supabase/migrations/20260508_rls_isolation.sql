-- Migration: Multi-tenant RLS Isolation
-- Tables: tenants, orders, products, loyalty_accounts, referral_codes, ai_logs, subscriptions

-- 1. Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS orders_tenant_id_idx ON orders (tenant_id);
CREATE INDEX IF NOT EXISTS products_tenant_id_idx ON products (tenant_id);
CREATE INDEX IF NOT EXISTS loyalty_accounts_tenant_id_idx ON loyalty_accounts (tenant_id);
CREATE INDEX IF NOT EXISTS referral_codes_tenant_id_idx ON referral_codes (tenant_id);
CREATE INDEX IF NOT EXISTS ai_logs_tenant_id_idx ON ai_logs (tenant_id);

-- 3. Tenant Table Policies (Self-access)
CREATE POLICY "tenants_isolation" ON tenants
FOR ALL USING (id = (auth.jwt() ->> 'tenant_id')::uuid);

-- 4. Unified Tenant Isolation Policies
-- Using auth.jwt() -> 'tenant_id' for multi-tenant SaaS isolation

-- ORDERS
CREATE POLICY "orders_tenant_isolation" ON orders
FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- PRODUCTS
CREATE POLICY "products_tenant_isolation" ON products
FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- LOYALTY
CREATE POLICY "loyalty_accounts_tenant_isolation" ON loyalty_accounts
FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "loyalty_transactions_tenant_isolation" ON loyalty_transactions
FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- REFERRALS
CREATE POLICY "referral_codes_tenant_isolation" ON referral_codes
FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "referral_transactions_tenant_isolation" ON referral_transactions
FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- AI LOGS / CONVERSATIONS
CREATE POLICY "ai_logs_tenant_isolation" ON ai_logs
FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- SUBSCRIPTIONS (IF TABLE EXISTS)
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'subscriptions') THEN
    ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "subscriptions_tenant_isolation" ON subscriptions
    FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
    WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;
END $$;

-- ============================================================
-- Snacks 911 — FIX: Realtime Audio & RLS
-- Resolves issue where KDS/Admin won't sound on new orders
-- because ANON role lacked SELECT permission (required for Realtime)
-- ============================================================

-- 1. Ensure 'orders' table is in the realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE orders;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add orders to publication (might already exist or publication missing)';
END $$;

-- 2. Grant SELECT permission to ANON role (required for Realtime INSERT events)
-- Without this, the frontend listener receives nothing because RLS blocks it.
DROP POLICY IF EXISTS orders_anon_read ON orders;
CREATE POLICY orders_anon_read ON orders FOR SELECT TO anon USING (true);

-- 3. Also grant to AUTHENTICATED for redundancy
DROP POLICY IF EXISTS orders_auth_read ON orders;
CREATE POLICY orders_auth_read ON orders FOR SELECT TO authenticated USING (true);

-- 4. Ensure RLS is enabled
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

RAISE NOTICE 'Realtime RLS patch applied to orders table';

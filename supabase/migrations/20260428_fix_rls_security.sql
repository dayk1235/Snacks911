-- ============================================================
-- Snacks 911 — FIX: Critical RLS Security Patches
-- Fixes overly permissive policies from previous migrations
-- Only modifies tables that exist in the database
-- ============================================================


-- ============================================================
-- 1. CASH SESSIONS & MOVEMENTS - Restrict to staff only
-- ============================================================

DO $$
BEGIN
    -- Only apply if cash_sessions table exists
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'cash_sessions') THEN
        
        -- Drop the insecure policies that allow anon access
        DROP POLICY IF EXISTS cash_sessions_all ON cash_sessions;
        
        -- Ensure table has RLS enabled
        ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
        
        -- Create secure policies: only authenticated staff can access
        DROP POLICY IF EXISTS cash_sessions_staff_select ON cash_sessions;
        CREATE POLICY cash_sessions_staff_select ON cash_sessions FOR SELECT
            TO authenticated
            USING (is_staff());

        DROP POLICY IF EXISTS cash_sessions_staff_insert ON cash_sessions;
        CREATE POLICY cash_sessions_staff_insert ON cash_sessions FOR INSERT
            TO authenticated
            WITH CHECK (is_staff());

        DROP POLICY IF EXISTS cash_sessions_staff_update ON cash_sessions;
        CREATE POLICY cash_sessions_staff_update ON cash_sessions FOR UPDATE
            TO authenticated
            USING (is_staff())
            WITH CHECK (is_staff());
        
        -- Prevent deletion of cash sessions (audit trail)
        DROP POLICY IF EXISTS cash_sessions_no_delete ON cash_sessions;
        CREATE POLICY cash_sessions_no_delete ON cash_sessions FOR DELETE
            USING (false);
        
        RAISE NOTICE 'Applied security fix to cash_sessions';
    END IF;
    
    -- Only apply if cash_movements table exists
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'cash_movements') THEN
        
        -- Drop the insecure policies
        DROP POLICY IF EXISTS cash_movements_all ON cash_movements;
        
        -- Ensure table has RLS enabled
        ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;
        
        -- Create secure policies: staff only
        DROP POLICY IF EXISTS cash_movements_staff_select ON cash_movements;
        CREATE POLICY cash_movements_staff_select ON cash_movements FOR SELECT
            TO authenticated
            USING (is_staff());

        DROP POLICY IF EXISTS cash_movements_staff_insert ON cash_movements;
        CREATE POLICY cash_movements_staff_insert ON cash_movements FOR INSERT
            TO authenticated
            WITH CHECK (is_staff());
        
        -- Prevent updates and deletes (immutable financial records)
        DROP POLICY IF EXISTS cash_movements_no_update ON cash_movements;
        CREATE POLICY cash_movements_no_update ON cash_movements FOR UPDATE
            USING (false);

        DROP POLICY IF EXISTS cash_movements_no_delete ON cash_movements;
        CREATE POLICY cash_movements_no_delete ON cash_movements FOR DELETE
            USING (false);
        
        RAISE NOTICE 'Applied security fix to cash_movements';
    END IF;
END $$;


-- ============================================================
-- 2. WHATSAPP SESSIONS - Restrict access
-- ============================================================

DO $$
BEGIN
    -- Only apply if wa_sessions table exists
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'wa_sessions') THEN
        
        -- Ensure table has RLS
        ALTER TABLE wa_sessions ENABLE ROW LEVEL SECURITY;
        
        -- Drop any existing insecure policies
        DROP POLICY IF EXISTS wa_sessions_all ON wa_sessions;
        
        -- Policy 1: System/Bot can insert/update (for WhatsApp webhook)
        DROP POLICY IF EXISTS wa_sessions_system_insert ON wa_sessions;
        CREATE POLICY wa_sessions_system_insert ON wa_sessions FOR INSERT
            WITH CHECK (true);

        DROP POLICY IF EXISTS wa_sessions_system_update ON wa_sessions;
        CREATE POLICY wa_sessions_system_update ON wa_sessions FOR UPDATE
            USING (true);

        -- Policy 2: Staff can read all sessions (for monitoring)
        DROP POLICY IF EXISTS wa_sessions_staff_select ON wa_sessions;
        CREATE POLICY wa_sessions_staff_select ON wa_sessions FOR SELECT
            TO authenticated
            USING (is_staff());

        -- Policy 3: Prevent deletion (keep conversation history)
        DROP POLICY IF EXISTS wa_sessions_no_delete ON wa_sessions;
        CREATE POLICY wa_sessions_no_delete ON wa_sessions FOR DELETE
            USING (false);
        
        RAISE NOTICE 'Applied security fix to wa_sessions';
    END IF;
END $$;


-- ============================================================
-- 3. WHATSAPP EVENTS - Restrict access
-- ============================================================

DO $$
BEGIN
    -- Only apply if wa_events table exists
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'wa_events') THEN
        
        -- Ensure table has RLS
        ALTER TABLE wa_events ENABLE ROW LEVEL SECURITY;
        
        -- Drop any existing insecure policies
        DROP POLICY IF EXISTS wa_events_all ON wa_events;
        
        -- System/Bot can insert events (for analytics)
        DROP POLICY IF EXISTS wa_events_system_insert ON wa_events;
        CREATE POLICY wa_events_system_insert ON wa_events FOR INSERT
            WITH CHECK (true);

        -- Staff can read events (for reporting)
        DROP POLICY IF EXISTS wa_events_staff_select ON wa_events;
        CREATE POLICY wa_events_staff_select ON wa_events FOR SELECT
            TO authenticated
            USING (is_staff());

        -- Prevent updates and deletes (immutable analytics data)
        DROP POLICY IF EXISTS wa_events_no_update ON wa_events;
        CREATE POLICY wa_events_no_update ON wa_events FOR UPDATE
            USING (false);

        DROP POLICY IF EXISTS wa_events_no_delete ON wa_events;
        CREATE POLICY wa_events_no_delete ON wa_events FOR DELETE
            USING (false);
        
        RAISE NOTICE 'Applied security fix to wa_events';
    END IF;
END $$;


-- ============================================================
-- 4. COMBO ITEMS & MODIFIERS - Public read, admin write
-- ============================================================

DO $$
BEGIN
    -- Combo items table
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'combo_items') THEN
        ALTER TABLE combo_items ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS combo_items_all ON combo_items;
        
        -- Public read (needed for menu display)
        DROP POLICY IF EXISTS combo_items_read ON combo_items;
        CREATE POLICY combo_items_read ON combo_items FOR SELECT
            USING (true);

        -- Admin write only
        DROP POLICY IF EXISTS combo_items_admin_insert ON combo_items;
        CREATE POLICY combo_items_admin_insert ON combo_items FOR INSERT
            TO authenticated
            WITH CHECK (is_admin());

        DROP POLICY IF EXISTS combo_items_admin_update ON combo_items;
        CREATE POLICY combo_items_admin_update ON combo_items FOR UPDATE
            TO authenticated
            USING (is_admin())
            WITH CHECK (is_admin());

        DROP POLICY IF EXISTS combo_items_admin_delete ON combo_items;
        CREATE POLICY combo_items_admin_delete ON combo_items FOR DELETE
            TO authenticated
            USING (is_admin());
        
        RAISE NOTICE 'Applied security fix to combo_items';
    END IF;
    
    -- Modifiers table
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'modifiers') THEN
        ALTER TABLE modifiers ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS modifiers_all ON modifiers;
        
        -- Public read (needed for customization)
        DROP POLICY IF EXISTS modifiers_read ON modifiers;
        CREATE POLICY modifiers_read ON modifiers FOR SELECT
            USING (true);

        -- Admin write only
        DROP POLICY IF EXISTS modifiers_admin_insert ON modifiers;
        CREATE POLICY modifiers_admin_insert ON modifiers FOR INSERT
            TO authenticated
            WITH CHECK (is_admin());

        DROP POLICY IF EXISTS modifiers_admin_update ON modifiers;
        CREATE POLICY modifiers_admin_update ON modifiers FOR UPDATE
            TO authenticated
            USING (is_admin())
            WITH CHECK (is_admin());

        DROP POLICY IF EXISTS modifiers_admin_delete ON modifiers;
        CREATE POLICY modifiers_admin_delete ON modifiers FOR DELETE
            TO authenticated
            USING (is_admin());
        
        RAISE NOTICE 'Applied security fix to modifiers';
    END IF;
    
    -- Product modifier rules table
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'product_modifier_rules') THEN
        ALTER TABLE product_modifier_rules ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS product_modifier_rules_all ON product_modifier_rules;
        
        -- Public read
        DROP POLICY IF EXISTS product_modifier_rules_read ON product_modifier_rules;
        CREATE POLICY product_modifier_rules_read ON product_modifier_rules FOR SELECT
            USING (true);

        -- Admin write only
        DROP POLICY IF EXISTS product_modifier_rules_admin_insert ON product_modifier_rules;
        CREATE POLICY product_modifier_rules_admin_insert ON product_modifier_rules FOR INSERT
            TO authenticated
            WITH CHECK (is_admin());

        DROP POLICY IF EXISTS product_modifier_rules_admin_update ON product_modifier_rules;
        CREATE POLICY product_modifier_rules_admin_update ON product_modifier_rules FOR UPDATE
            TO authenticated
            USING (is_admin())
            WITH CHECK (is_admin());

        DROP POLICY IF EXISTS product_modifier_rules_admin_delete ON product_modifier_rules;
        CREATE POLICY product_modifier_rules_admin_delete ON product_modifier_rules FOR DELETE
            TO authenticated
            USING (is_admin());
        
        RAISE NOTICE 'Applied security fix to product_modifier_rules';
    END IF;
END $$;


-- ============================================================
-- 5. ANNOUNCEMENTS & FAQ - Public read, admin write
-- ============================================================

DO $$
BEGIN
    -- Announcements table
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'announcements') THEN
        ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS announcements_all ON announcements;
        
        -- Public read (for display to customers)
        DROP POLICY IF EXISTS announcements_read ON announcements;
        CREATE POLICY announcements_read ON announcements FOR SELECT
            USING (true);

        -- Admin write only
        DROP POLICY IF EXISTS announcements_admin_insert ON announcements;
        CREATE POLICY announcements_admin_insert ON announcements FOR INSERT
            TO authenticated
            WITH CHECK (is_admin());

        DROP POLICY IF EXISTS announcements_admin_update ON announcements;
        CREATE POLICY announcements_admin_update ON announcements FOR UPDATE
            TO authenticated
            USING (is_admin())
            WITH CHECK (is_admin());

        DROP POLICY IF EXISTS announcements_admin_delete ON announcements;
        CREATE POLICY announcements_admin_delete ON announcements FOR DELETE
            TO authenticated
            USING (is_admin());
        
        RAISE NOTICE 'Applied security fix to announcements';
    END IF;
    
    -- FAQ table
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'faqs') THEN
        ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS faqs_all ON faqs;
        
        -- Public read
        DROP POLICY IF EXISTS faqs_read ON faqs;
        CREATE POLICY faqs_read ON faqs FOR SELECT
            USING (true);

        -- Admin write only
        DROP POLICY IF EXISTS faqs_admin_insert ON faqs;
        CREATE POLICY faqs_admin_insert ON faqs FOR INSERT
            TO authenticated
            WITH CHECK (is_admin());

        DROP POLICY IF EXISTS faqs_admin_update ON faqs;
        CREATE POLICY faqs_admin_update ON faqs FOR UPDATE
            TO authenticated
            USING (is_admin())
            WITH CHECK (is_admin());

        DROP POLICY IF EXISTS faqs_admin_delete ON faqs;
        CREATE POLICY faqs_admin_delete ON faqs FOR DELETE
            TO authenticated
            USING (is_admin());
        
        RAISE NOTICE 'Applied security fix to faqs';
    END IF;
END $$;


-- ============================================================
-- 6. ORDER ITEMS - Match orders table policies
-- ============================================================

DO $$
BEGIN
    -- Only apply if order_items table exists
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'order_items') THEN
        ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS order_items_all ON order_items;
        
        -- Anyone can insert (when creating orders)
        DROP POLICY IF EXISTS order_items_customer_insert ON order_items;
        CREATE POLICY order_items_customer_insert ON order_items FOR INSERT
            WITH CHECK (true);

        -- Staff can read
        DROP POLICY IF EXISTS order_items_staff_read ON order_items;
        CREATE POLICY order_items_staff_read ON order_items FOR SELECT
            TO authenticated
            USING (is_staff());

        -- Staff can update
        DROP POLICY IF EXISTS order_items_staff_update ON order_items;
        CREATE POLICY order_items_staff_update ON order_items FOR UPDATE
            TO authenticated
            USING (is_staff())
            WITH CHECK (is_staff());

        -- Prevent deletes (keep order history)
        DROP POLICY IF EXISTS order_items_no_delete ON order_items;
        CREATE POLICY order_items_no_delete ON order_items FOR DELETE
            USING (false);
        
        RAISE NOTICE 'Applied security fix to order_items';
    END IF;
END $$;


-- ============================================================
-- 7. ADD MISSING INDEXES FOR PERFORMANCE
-- ============================================================

-- Index for employee lookup by employee_id (used in is_admin/is_staff)
CREATE INDEX IF NOT EXISTS idx_employees_employee_id_active 
    ON employees (employee_id, active) WHERE active = true;

-- Index for cash sessions by status and date (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'cash_sessions') THEN
        CREATE INDEX IF NOT EXISTS idx_cash_sessions_status_date 
            ON cash_sessions (status, opened_at DESC);
    END IF;
END $$;

-- Index for WhatsApp sessions by last interaction (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'wa_sessions') THEN
        CREATE INDEX IF NOT EXISTS idx_wa_sessions_last_interaction 
            ON wa_sessions (last_interaction DESC) 
            WHERE state != 'S0_IDLE';
    END IF;
END $$;

-- Index for events by type and date (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'wa_events') THEN
        CREATE INDEX IF NOT EXISTS idx_wa_events_type_created 
            ON wa_events (event_type, created_at DESC);
    END IF;
END $$;


-- ============================================================
-- 8. SECURITY AUDIT LOG
-- ============================================================

-- Log this security fix (only if audit_logs table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'audit_logs') THEN
        INSERT INTO audit_logs (table_name, record_id, action, new_data, changed_by)
        VALUES (
            'system',
            'security_patch_001',
            'UPDATE',
            jsonb_build_object(
                'description', 'Applied critical RLS security patches',
                'tables_affected', jsonb_build_array(
                    'cash_sessions',
                    'cash_movements',
                    'combo_items',
                    'modifiers',
                    'order_items'
                ),
                'applied_at', to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
            ),
            'system_migration'
        ) ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Security patch logged in audit_logs';
    END IF;
END $$;

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE '=== Security Fix Complete ===';
    RAISE NOTICE 'Check the notices above to see which tables were updated.';
    RAISE NOTICE 'Tables that do not exist in your database were skipped.';
END $$;
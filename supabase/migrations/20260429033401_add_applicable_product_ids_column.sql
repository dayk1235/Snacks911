-- ============================================================
-- FASE 3 AI ORCHESTRATOR
-- Add applicable_product_ids column to products table
-- Required for recommendation engine and upsell system
-- ============================================================

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS applicable_product_ids uuid[] DEFAULT '{}'::uuid[];

-- Add comment for documentation
COMMENT ON COLUMN products.applicable_product_ids IS 'List of product ids that this item is applicable to for upsells and combos';
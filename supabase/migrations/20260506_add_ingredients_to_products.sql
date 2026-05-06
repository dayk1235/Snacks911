-- Add ingredients column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS ingredients jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN products.ingredients IS 'Array of ingredient strings for allergy filtering';

-- Migration: Add review-related columns to orders table
-- Run once against your Supabase project.

DO $$ 
BEGIN 
  -- 1. delivered_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='delivered_at') THEN
    ALTER TABLE orders ADD COLUMN delivered_at TIMESTAMPTZ;
  END IF;

  -- 2. review_sent
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='review_sent') THEN
    ALTER TABLE orders ADD COLUMN review_sent BOOLEAN DEFAULT false;
  END IF;

  -- 3. rating
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='rating') THEN
    ALTER TABLE orders ADD COLUMN rating INTEGER;
  END IF;

  -- 4. review_escalated
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='review_escalated') THEN
    ALTER TABLE orders ADD COLUMN review_escalated BOOLEAN DEFAULT false;
  END IF;

  -- 5. review_comment
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='review_comment') THEN
    ALTER TABLE orders ADD COLUMN review_comment TEXT;
  END IF;
END $$;

-- Index for scheduler performance: find delivered orders not yet reviewed
CREATE INDEX IF NOT EXISTS orders_review_scheduler_idx ON orders (delivered_at, review_sent)
WHERE delivered_at IS NOT NULL AND review_sent = false;

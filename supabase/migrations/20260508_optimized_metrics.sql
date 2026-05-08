-- Migration: Performance Optimization via Pre-aggregation
-- Object: Materialized View for Tenant Daily Metrics

CREATE MATERIALIZED VIEW IF NOT EXISTS tenant_daily_metrics AS
SELECT
  tenant_id,
  DATE_TRUNC('day', created_at) as day,
  COUNT(id) as order_count,
  SUM(total) as daily_revenue,
  AVG(total) as avg_ticket_size,
  COUNT(DISTINCT customer_id) as unique_customers
FROM orders
WHERE status = 'paid' OR status = 'completed'
GROUP BY tenant_id, DATE_TRUNC('day', created_at)
WITH NO DATA;

-- 1. Optimized Indexes for the Materialized View
CREATE UNIQUE INDEX IF NOT EXISTS tenant_daily_metrics_uidx 
ON tenant_daily_metrics (tenant_id, day);

CREATE INDEX IF NOT EXISTS tenant_daily_metrics_day_idx 
ON tenant_daily_metrics (day);

-- 2. Concurrently Refresh Strategy
-- Note: Requires the unique index created above
CREATE OR REPLACE FUNCTION refresh_tenant_metrics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY tenant_daily_metrics;
END;
$$ LANGUAGE plpgsql;

-- 3. Automatic Refresh Trigger (Optional: use pg_cron for production)
-- SELECT cron.schedule('refresh-metrics', '0 * * * *', 'SELECT refresh_tenant_metrics()');

-- 4. Optimized Base Table Indexing for Aggregation
CREATE INDEX IF NOT EXISTS orders_metrics_composite_idx 
ON orders (tenant_id, created_at) 
WHERE status IN ('paid', 'completed');

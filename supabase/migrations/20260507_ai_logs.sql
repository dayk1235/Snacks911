CREATE TABLE IF NOT EXISTS ai_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id TEXT,
    user_id TEXT,
    channel TEXT,
    input TEXT,
    intent TEXT,
    flow_state TEXT,
    cart JSONB,
    total NUMERIC,
    products_shown JSONB,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

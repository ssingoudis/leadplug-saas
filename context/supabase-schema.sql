-- Solar Funnel Widget – Supabase Schema
-- Run this in the Supabase SQL editor to provision the tracking tables.
-- Idempotent: safe to re-run on existing databases.

CREATE TABLE IF NOT EXISTS submissions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at      TIMESTAMP WITH TIME ZONE,
  tenant_slug     TEXT NOT NULL,
  contact_name    TEXT NOT NULL,
  contact_email   TEXT NOT NULL,
  contact_phone   TEXT,
  answers         JSONB NOT NULL,
  price_min       INTEGER,
  price_max       INTEGER,
  price_per_lead  NUMERIC(10,4) NOT NULL DEFAULT 0.10,
  source_url      TEXT,
  user_agent      TEXT,
  emails_sent     BOOLEAN DEFAULT FALSE,
  billed          BOOLEAN DEFAULT FALSE
);

-- Idempotent column additions for deployments created before task #22
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS started_at     TIMESTAMP WITH TIME ZONE;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS source_url     TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS user_agent     TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS price_per_lead NUMERIC(10,4) NOT NULL DEFAULT 0.10;

CREATE INDEX IF NOT EXISTS idx_submissions_tenant
  ON submissions(tenant_slug);

CREATE INDEX IF NOT EXISTS idx_submissions_billing
  ON submissions(tenant_slug, billed, created_at);

-- Monthly billing view: one row per tenant per month.
-- SUM(price_per_lead) respects per-tenant pricing and historic rates.
CREATE OR REPLACE VIEW monthly_billing AS
SELECT
  tenant_slug,
  DATE_TRUNC('month', created_at)          AS month,
  COUNT(*)                                  AS submission_count,
  SUM(price_per_lead)                       AS amount_eur,
  SUM(CASE WHEN billed THEN 1 ELSE 0 END)   AS already_billed
FROM submissions
GROUP BY tenant_slug, DATE_TRUNC('month', created_at)
ORDER BY month DESC, tenant_slug;

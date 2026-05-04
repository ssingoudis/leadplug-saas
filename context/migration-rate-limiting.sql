-- ============================================================
-- Migration: Rate Limiting – ip_address Spalte + Index
-- Idempotent: safe to re-run
-- ============================================================

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS ip_address TEXT;

CREATE INDEX IF NOT EXISTS idx_submissions_ip_created
  ON submissions (ip_address, created_at)
  WHERE honeypot_triggered = FALSE;

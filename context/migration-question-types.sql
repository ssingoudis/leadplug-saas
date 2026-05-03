-- ============================================================
-- Migration: Fragetypen zu funnel_questions hinzufügen
-- Ausführen in Supabase SQL-Editor (einmalig auf bestehender DB)
-- Idempotent: safe to re-run
-- ============================================================

-- 1. ENUM-Typ erstellen (falls noch nicht vorhanden)
DO $$ BEGIN
  CREATE TYPE question_type AS ENUM (
    'single_choice',
    'multiple_choice',
    'short_text',
    'long_text',
    'slider'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. question_type-Spalte hinzufügen
--    Alle bestehenden Zeilen bekommen automatisch 'single_choice'
ALTER TABLE funnel_questions
  ADD COLUMN IF NOT EXISTS question_type question_type NOT NULL DEFAULT 'single_choice';

-- 3. config-Spalte hinzufügen
ALTER TABLE funnel_questions
  ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}';

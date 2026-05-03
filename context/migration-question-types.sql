-- ============================================================
-- Migration: Fragetypen zu funnel_questions hinzufügen
-- Ausführen in Supabase SQL-Editor (einmalig auf bestehender DB)
-- Idempotent: safe to re-run
-- ============================================================

-- 1. question_type-Spalte hinzufügen
--    Alle bestehenden Zeilen bekommen automatisch 'single_choice'
ALTER TABLE funnel_questions
  ADD COLUMN IF NOT EXISTS question_type TEXT NOT NULL DEFAULT 'single_choice';

-- 2. CHECK-Constraint setzen (DROP IF EXISTS für Idempotenz)
ALTER TABLE funnel_questions
  DROP CONSTRAINT IF EXISTS funnel_questions_question_type_check;

ALTER TABLE funnel_questions
  ADD CONSTRAINT funnel_questions_question_type_check
  CHECK (question_type IN (
    'single_choice', 'multiple_choice',
    'short_text', 'long_text', 'slider'
  ));

-- 3. config-Spalte hinzufügen
ALTER TABLE funnel_questions
  ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}';

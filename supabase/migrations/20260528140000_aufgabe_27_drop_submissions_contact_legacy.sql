-- =============================================================================
-- Aufgabe 27 — Phase B.3: Legacy submissions.contact_*-Spalten droppen
-- =============================================================================
-- Die 4 Spalten contact_anrede/name/email/phone wurden durch das contact-jsonb
-- abgelöst. Alle 26 bestehenden Zeilen haben contact jsonb befüllt (verifiziert).
--
-- VORAUSSETZUNG: App-Code wurde refactored und ist deployed — er liest/schreibt
-- nur noch contact (jsonb).
--
-- Rollback: siehe _DOWN.sql

BEGIN;

ALTER TABLE public.submissions
  DROP COLUMN contact_anrede,
  DROP COLUMN contact_name,
  DROP COLUMN contact_email,
  DROP COLUMN contact_phone;

COMMIT;

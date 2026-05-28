-- Aufgabe 34 Phase A: Rollback für Partial-Submissions-Schema
-- Entfernt session_id + completed_at, dropt die zugehörigen Indices und den Unique-Constraint.
-- WARNUNG: Dies verwirft alle Partial-Submission-Daten (abgebrochene Sessions).
-- Final-Completed-Submissions bleiben strukturell unverändert (haben weiter id, created_at, contact, answers).

DROP INDEX IF EXISTS submissions_abandoned_with_email_idx;
DROP INDEX IF EXISTS submissions_completed_at_idx;

ALTER TABLE submissions
  DROP CONSTRAINT IF EXISTS submissions_session_id_unique;

ALTER TABLE submissions
  DROP COLUMN IF EXISTS completed_at,
  DROP COLUMN IF EXISTS session_id;

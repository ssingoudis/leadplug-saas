-- Aufgabe 57B — Test-Mails in die Versand-Historie.
--
-- Konsistenz zu Webhooks: Test-Webhooks loggen ihren Zustellversuch als reguläre
-- webhook_delivery_attempts-Row (event_type='webhook.test'). Test-Mails taten das
-- bisher nicht (Aufgabe-41-Design: Tests laufen außerhalb der Drip-Queue) — Stavros-
-- Befund aus Aufgabe 56: Inkonsistenz.
--
-- email_delivery_attempts hat keine event_type-Spalte → boolean-Flag.
-- sendTestEmail legt künftig nach jedem tatsächlichen Send-Versuch eine Row an:
-- submission_id=NULL (kein echter Lead), status terminal (success/failed),
-- is_test=true. Terminal-Status ⇒ Cron-Queues (pending/retrying) fassen Test-Rows
-- nie an; aggregateEmailStatusForSubmission filtert auf submission_id ⇒ unberührt.
--
-- Additiv, Default false ⇒ alle Bestands-Rows sind korrekt als „echt" markiert.
-- Rollback: 20260610190000_aufgabe_57b_email_test_logging_DOWN.sql

ALTER TABLE public.email_delivery_attempts
  ADD COLUMN is_test boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.email_delivery_attempts.is_test IS
  'Aufgabe 57B: true = Test-Versand aus dem Editor (submission_id NULL, terminal). false = echter Drip-Versand.';

-- ROLLBACK für 20260610190000_aufgabe_57b_email_test_logging.sql
-- Achtung Reihenfolge: erst den Code zurückrollen (sendTestEmail insertet is_test),
-- dann die Spalte droppen — sonst failt jeder Test-Send-Log-Insert.
-- Die Test-Log-Rows selbst bleiben erhalten (ununterscheidbar von echten Sends,
-- aber submission_id NULL + terminal — stören keine Queue/Aggregation).

ALTER TABLE public.email_delivery_attempts
  DROP COLUMN IF EXISTS is_test;

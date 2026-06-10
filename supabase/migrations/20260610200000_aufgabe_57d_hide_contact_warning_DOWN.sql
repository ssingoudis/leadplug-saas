-- ROLLBACK für 20260610200000_aufgabe_57d_hide_contact_warning.sql
-- Achtung Reihenfolge: erst den Code zurückrollen (PATCH-Route + Editor lesen/schreiben
-- die Spalte), dann droppen — sonst failt jedes Ausblenden mit 500.

ALTER TABLE public.funnels
  DROP COLUMN IF EXISTS hide_contact_warning;

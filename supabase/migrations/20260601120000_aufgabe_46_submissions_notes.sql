-- Aufgabe 46: Mini-CRM — Notizfeld pro Lead.
-- Bislang konnte eine Agentur zu einem Lead keine interne Notiz festhalten. Das CRM
-- bekommt jetzt ein freies Textfeld pro Submission (z.B. "Rückruf vereinbart 14:00").
--
-- Additive, nullable Spalte, kein Backfill, kein CHECK (Längen-Cap erfolgt app-seitig
-- in /api/leads/[id]). Der bestehende submissions.status-Workflow (offen/kontaktiert/
-- abgeschlossen) bleibt unverändert — nur das UI labelt ihn neu als Neu/Kontaktiert/Erledigt.

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS notes text NULL;

COMMENT ON COLUMN submissions.notes IS
  'Aufgabe 46: Freie interne CRM-Notiz des Tenants zu diesem Lead. NULL = keine Notiz. Editierbar über /api/leads/[id] (RLS-geschützt).';

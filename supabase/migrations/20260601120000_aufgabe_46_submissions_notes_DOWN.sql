-- DOWN für Aufgabe 46: Notizfeld wieder entfernen.
-- Verlustbehaftet (alle eingetragenen Notizen gehen verloren) — nur für echten Rollback.

ALTER TABLE submissions
  DROP COLUMN IF EXISTS notes;

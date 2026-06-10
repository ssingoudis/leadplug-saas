-- Aufgabe 56 — Design-Schalter (DOWN)
-- Achtung Reihenfolge: erst Code zurückrollen (PUT schreibt die Spalten), dann droppen.

ALTER TABLE funnels
  DROP COLUMN IF EXISTS show_progress_bar,
  DROP COLUMN IF EXISTS show_step_badge,
  DROP COLUMN IF EXISTS title_alignment;

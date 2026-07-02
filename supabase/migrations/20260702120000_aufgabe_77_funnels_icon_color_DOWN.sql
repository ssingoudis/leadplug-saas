-- Aufgabe 77 — Icon-Bibliothek: funnel-weiter Icon-Farbmodus (DOWN)
-- Achtung Reihenfolge: erst Code zurückrollen (PUT schreibt die Spalte), dann droppen.
-- Gespeicherte `icon_key`-Werte im fields.options-jsonb sind ohne den Render-Pfad
-- inert (werden ignoriert) — kein DB-Eingriff nötig.

ALTER TABLE funnels
  DROP COLUMN IF EXISTS icon_color;

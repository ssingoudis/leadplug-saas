-- =============================================================================
-- Aufgabe 62 — Vorlagen-Galerie + Funnel-Duplizieren (DOWN)
--
-- Reihenfolge beachten: erst den Code zurückrollen (Galerie-Seite + Routes
-- nutzen die RPCs/Tabelle), dann dieses File anwenden.
-- Bereits aus Vorlagen erzeugte / duplizierte Funnels bleiben bestehen —
-- sie sind normale Funnels und hängen nicht an der Tabelle.
-- =============================================================================

drop function if exists public.duplicate_funnel(text);
drop function if exists public.create_funnel_from_template(text, uuid, text);
drop function if exists public.snapshot_funnel_to_template(text, text, text, text, text, int);

drop table if exists public.funnel_templates;

-- =============================================================================
-- Aufgabe 77 — Icon-Bibliothek: funnel-weiter Icon-Farbmodus (UP)
--
--   • icon_color — Farbmodus der Bibliotheks-Icons bei Bild-Optionen (Design-Panel):
--     'neutral' = Textfarbe des Themes (Default), 'brand' = Hauptfarbe.
--
-- Nullable, NULL = App-Default 'neutral' — Muster der übrigen Theme-Spalten
-- (primary_color etc.), hält Rows schlank; der Editor schreibt nur 'brand' aus.
-- Additiv: bestehende Funnels behalten exakt das heutige Verhalten; alter
-- deployter Code selektiert Spalten explizit und ist unberührt.
--
-- Die Icon-Keys pro Option (`icon_key` im fields.options-jsonb) brauchen KEINE
-- Migration — schema-flexibles jsonb, wie `image_url` in Aufgabe 76.
--
-- Rollback: 20260702120000_aufgabe_77_funnels_icon_color_DOWN.sql
-- =============================================================================

ALTER TABLE funnels
  ADD COLUMN icon_color text
    CONSTRAINT funnels_icon_color_check CHECK (icon_color IN ('neutral', 'brand'));

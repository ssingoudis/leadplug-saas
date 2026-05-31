-- Aufgabe 43: Rollback Conversion-Tracking-Felder.
-- Entfernt beide Spalten. Hinterlegte Pixel-IDs gehen verloren; embed.js feuert dann
-- nur noch das dataLayer-Event + die optionalen data-Attribute (Aufgabe-42-Verhalten).

ALTER TABLE funnels
  DROP COLUMN IF EXISTS meta_pixel_id,
  DROP COLUMN IF EXISTS google_ads_conversion;

-- Aufgabe 43: Turnkey-Conversion-Tracking.
-- Pro Funnel kann der Tenant seine Werbe-Conversion-IDs hinterlegen. Das Embed-Script
-- (public/embed.js) feuert damit beim Lead automatisch die Meta-/Google-Conversion —
-- der Kunde muss keinen Pixel-Code selbst verdrahten.
--
-- Beide Spalten sind öffentliche Bezeichner (stehen normal eh im Seitenquelltext),
-- nullable, kein Backfill. Format-Validierung erfolgt app-seitig (kein DB-CHECK, damit
-- spätere Format-Varianten nicht an einer Migration hängen).

ALTER TABLE funnels
  ADD COLUMN IF NOT EXISTS meta_pixel_id text NULL,
  ADD COLUMN IF NOT EXISTS google_ads_conversion text NULL;

COMMENT ON COLUMN funnels.meta_pixel_id IS
  'Aufgabe 43: Meta-(Facebook-)Pixel-ID (numerisch). Wenn gesetzt, feuert embed.js fbq(track,Lead) beim Submit. NULL = aus.';

COMMENT ON COLUMN funnels.google_ads_conversion IS
  'Aufgabe 43: Google-Ads-Conversion send_to (Format AW-XXXXXXXXX/Label). Wenn gesetzt, feuert embed.js gtag(event,conversion) beim Submit. NULL = aus.';

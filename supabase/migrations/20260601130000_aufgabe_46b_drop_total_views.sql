-- Aufgabe 46 (Phase 3): total_views-Zähler + increment_funnel_views entfernen.
--
-- funnel_view_logs ist die einzige Aufruf-Quelle (eine Zeile pro Aufruf mit Zeitstempel
-- → per Tag/Monat/Funnel aufschlüsselbar). total_views war ein redundanter denormalisierter
-- Zähler ohne Zeitstempel; die App liest ihn nicht mehr, track-view schreibt ihn nicht mehr.
-- Nebeneffekt: behebt den Security-Advisor (anon-executable SECURITY DEFINER function).
--
-- WICHTIG — ERST NACH DEM DEPLOY dieses Branches anwenden: solange `main` läuft, liest
-- der alte Code total_views (getTenantConfig/dashboard/statistiken/funnels) → ein Drop
-- davor bräche Live-Widgets + Dashboard. Reihenfolge: merge → Vercel-Deploy → dann diese Migration.

DROP FUNCTION IF EXISTS public.increment_funnel_views(text);

ALTER TABLE funnels DROP COLUMN IF EXISTS total_views;

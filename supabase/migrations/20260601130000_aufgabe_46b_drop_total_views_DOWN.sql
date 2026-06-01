-- DOWN für Aufgabe 46 Phase 3: Zähler-Spalte + increment-Funktion wiederherstellen.
-- Die historischen Zählerstände sind verloren (DOWN setzt alles auf 0 zurück) — die
-- echten Aufrufe leben weiter in funnel_view_logs.

ALTER TABLE funnels ADD COLUMN IF NOT EXISTS total_views integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_funnel_views(funnel_slug text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  UPDATE funnels SET total_views = total_views + 1 WHERE slug = funnel_slug;
$function$;

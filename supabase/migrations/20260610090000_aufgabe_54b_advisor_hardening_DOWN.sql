-- =============================================================================
-- Aufgabe 54b — Supabase-Advisor-Härtung (DOWN)
-- Stellt die Postgres-Defaults wieder her (Funktionen haben standardmäßig
-- EXECUTE für PUBLIC; search_path war ungesetzt).
-- =============================================================================

grant execute on function public.rls_auto_enable() to public;

alter function public.update_updated_at() reset search_path;

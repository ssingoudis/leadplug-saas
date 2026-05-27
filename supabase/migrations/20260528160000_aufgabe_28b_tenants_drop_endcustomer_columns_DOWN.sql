-- ============================================================================
-- DOWN für Aufgabe 28b — Phase 2 Rollback (Schema-Restore).
--
-- ACHTUNG: Spalten-Daten sind nach DROP unwiderruflich verloren.
-- Diese DOWN-Migration stellt nur das Schema wieder her, NICHT die Daten.
-- Falls Daten-Rollback gebraucht: aus tägliches Supabase-Auto-Backup restoren.
--
-- Nach diesem DOWN sind die Spalten nullable (NOT-NULL kann nicht wiederhergestellt
-- werden, da Daten fehlen). Optionaler Folge-Schritt: Backfill aus funnels.footer_*
-- + funnels.notification_email, dann SET NOT NULL.
-- ============================================================================

BEGIN;

ALTER TABLE public.tenants ADD COLUMN notification_email text;
ALTER TABLE public.tenants ADD COLUMN public_email text;
ALTER TABLE public.tenants ADD COLUMN public_phone text;
ALTER TABLE public.tenants ADD COLUMN address text;

COMMIT;

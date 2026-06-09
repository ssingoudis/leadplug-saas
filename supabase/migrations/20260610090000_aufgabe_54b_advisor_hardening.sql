-- =============================================================================
-- Aufgabe 54b — Supabase-Advisor-Härtung (UP)
--
-- 1. rls_auto_enable(): Event-Trigger-Funktion (SECURITY DEFINER) war via
--    /rest/v1/rpc/ von anon + authenticated aufrufbar (Advisor 0028/0029).
--    Event-Trigger feuern systemseitig und brauchen keine EXECUTE-Grants —
--    der RPC-Zugang wird komplett entzogen. (current_tenant_ids /
--    current_tenant_role bleiben bewusst für authenticated ausführbar —
--    die RLS-Policies rufen sie im Kontext des Users auf.)
--
-- 2. update_updated_at(): search_path pinnen (Advisor 0011, mutable search_path).
--    Trigger-Funktion ohne Tabellen-Referenzen — rein defensiv.
--
-- Nicht per SQL adressierbar (Auth-Config, im Dashboard aktivieren):
--    Leaked-Password-Protection (HaveIBeenPwned-Check) unter
--    Authentication → Sign In / Up → Passwords.
--
-- Rollback: 20260610090000_aufgabe_54b_advisor_hardening_DOWN.sql
-- =============================================================================

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

alter function public.update_updated_at() set search_path = public, pg_temp;

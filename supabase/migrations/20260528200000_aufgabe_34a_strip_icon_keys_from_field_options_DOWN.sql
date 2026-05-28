-- Aufgabe 34: Forward-only Migration — kein automatischer DOWN-Pfad.
--
-- Die icon_key + icon_url Werte wurden bewusst aus allen fields.options gestrippt
-- (Brand-Decision 2026-05-28, siehe strategy_icons_raus). Eine programmatische
-- Wiederherstellung ist nicht möglich, weil die Werte irreversibel entfernt wurden.
--
-- Rollback-Pfad bei Notfall:
--   1) Supabase-Auto-Backup von vor 2026-05-28 12:03:32 (Apply-Zeitpunkt) einspielen
--   2) ODER manuelles SQL gegen `submissions.answers`-Snapshots vergleichen, falls
--      historische Daten dort die alten Icon-Keys noch enthalten
--
-- Diese Datei existiert nur, damit die Konvention {migration}.sql + {migration}_DOWN.sql
-- auch für Aufgabe 34 erfüllt ist. Inhalt ist absichtlich leer (no-op).

SELECT 1; -- no-op

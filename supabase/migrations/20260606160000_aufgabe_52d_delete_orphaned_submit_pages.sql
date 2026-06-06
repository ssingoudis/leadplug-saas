-- Aufgabe 52D — orphaned Submit-Pages + Fields löschen
--
-- Seit Aufgabe 52D (Kontaktformular abgeschafft) ignoriert der Code page_type='submit'
-- vollständig: getTenantConfig liest sie nicht mehr, der Editor erzeugt/liest sie nicht mehr,
-- das Widget rendert kein Kontaktformular mehr. Diese Pages + ihre Fields sind reine Karteileichen.
--
-- Sicherheit (vor dem DELETE geprüft, 2026-06-06):
--   • 12 Submit-Pages (eine je Funnel, inkl. leadplug), 52 Fields.
--   • fields.page_id ist ON DELETE CASCADE → die 52 Fields gehen automatisch mit.
--   • 0 webhook_subscriptions zeigen via trigger_page_id auf eine Submit-Page.
--   • submissions (Leads) haben keinen FK auf pages → leadplugs 28 Leads bleiben unberührt.
--
-- Rollback: 20260606160000_aufgabe_52d_delete_orphaned_submit_pages_DOWN.sql
--           (re-INSERT der exakten Zeilen) ODER tägliches Supabase-Backup.

DELETE FROM pages WHERE page_type = 'submit';

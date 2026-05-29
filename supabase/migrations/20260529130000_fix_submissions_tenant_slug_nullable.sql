-- Fix-Migration (2026-05-29): submissions.tenant_slug auf NULLable setzen.
--
-- Hintergrund: Seit Aufgabe 26 (Drop tenants.slug am 2026-05-27) hat der App-Code
-- keine Quelle mehr für tenant_slug — Inserts versuchten NULL → Constraint-Violation.
-- Letzte erfolgreiche Submission war 2026-05-27 11:13. Seitdem ist /api/submit +
-- /api/track-progress effektiv tot. Dokumentiert (project-overview.md §4, CLAUDE.md
-- §13.3) war das Verhalten schon, nur der DB-Constraint blieb.
--
-- Forward-only — Rollback ist trivial (re-add NOT NULL nach backfill), wird aber
-- nicht erwartet weil tenant_slug = Legacy-Snapshot ohne aktive Quelle.

ALTER TABLE public.submissions ALTER COLUMN tenant_slug DROP NOT NULL;

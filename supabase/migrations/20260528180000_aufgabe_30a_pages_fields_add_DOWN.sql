-- ============================================================================
-- DOWN für Aufgabe 30 Migration 1/2 — pages + fields entfernen.
--
-- Sicher anwendbar weil funnel_questions + funnels.contact_fields in
-- Phase 1 unverändert bleiben — keine Daten gehen verloren.
--
-- Reihenfolge: erst fields (FK auf pages), dann pages, dann Enums.
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS public.fields;
DROP TABLE IF EXISTS public.pages;

DROP TYPE IF EXISTS public.field_type;
DROP TYPE IF EXISTS public.page_type;

COMMIT;

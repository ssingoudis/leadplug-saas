-- =============================================================================
-- DOWN für Aufgabe 27 — Phase B.3: contact_*-Spalten wiederherstellen
-- =============================================================================
-- Stellt die 4 Spalten wieder her und backfilled sie aus dem contact jsonb.

BEGIN;

ALTER TABLE public.submissions
  ADD COLUMN contact_anrede text,
  ADD COLUMN contact_name   text,
  ADD COLUMN contact_email  text,
  ADD COLUMN contact_phone  text;

UPDATE public.submissions
SET contact_anrede = contact->>'anrede',
    contact_name   = COALESCE(contact->>'name', ''),
    contact_email  = contact->>'email',
    contact_phone  = contact->>'telefon';

COMMIT;

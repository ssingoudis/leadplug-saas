-- ROLLBACK für 20260606161000_aufgabe_52d_drop_skip_submit_step.sql
-- Stellt die Spalte mit der Aufgabe-35-Original-Definition wieder her.
-- Die alten (vestigialen) Werte sind verloren; Default false reproduziert das Ursprungs-Schema.

ALTER TABLE funnels ADD COLUMN IF NOT EXISTS skip_submit_step boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN funnels.skip_submit_step IS
  'Aufgabe 35: wenn true, überspringt das Widget die Submit-Page (Auto-Finish nach letzter Question-Page). Default false = Submit-Page wird gerendert.';

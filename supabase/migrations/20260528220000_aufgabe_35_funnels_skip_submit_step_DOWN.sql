-- Aufgabe 35: Rollback skip_submit_step.
-- Entfernt die Spalte. Im Skip-Mode angelegte Funnels verlieren ihre Konfiguration
-- und fallen auf das alte Verhalten zurück (Submit-Page wird gerendert).

ALTER TABLE funnels
  DROP COLUMN IF EXISTS skip_submit_step;

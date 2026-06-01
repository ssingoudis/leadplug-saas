-- Aufgabe 46c: tenants.website endgültig droppen.
--
-- Die Spalte wurde nur noch als Legacy-E-Mail-Variable {{website}} konsumiert; App-Refs
-- (getTenantConfig/emailTemplates/TenantConfig) sind seit dem Aufgabe-46-Deploy raus,
-- Daten waren bereits geleert (alle Werte waren Demo/Test). Erst NACH dem Deploy des
-- zugehörigen Codes angewendet, damit der Live-Code (getTenantConfig) die Spalte nicht mehr liest.

ALTER TABLE tenants DROP COLUMN IF EXISTS website;

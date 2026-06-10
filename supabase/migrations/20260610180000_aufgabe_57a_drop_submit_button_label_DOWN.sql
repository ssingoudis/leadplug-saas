-- ROLLBACK für 20260610180000_aufgabe_57a_drop_submit_button_label.sql
-- Stellt die Spalte mit der Original-Definition wieder her (text NULL, kein Default)
-- und schreibt die beim Drop vorhandenen Werte zurück (Snapshot vom 2026-06-10).

ALTER TABLE funnels ADD COLUMN IF NOT EXISTS submit_button_label text;

-- Snapshot-Restore: die einzigen 2 Rows mit Wert zum Drop-Zeitpunkt.
UPDATE funnels SET submit_button_label = 'Anfrage absenden'
WHERE id = '3e58abd1-3273-4d3c-85ca-de32e801f066';

UPDATE funnels SET submit_button_label = 'Anfrage absenden'
WHERE id = '46f88cf7-4aa8-41ae-802c-e98bc20988db';

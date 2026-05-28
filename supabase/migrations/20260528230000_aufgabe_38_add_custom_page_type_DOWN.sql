-- Aufgabe 38: Rollback Custom-Page-Type.
-- PostgreSQL erlaubt kein DROP VALUE für Enums. Wenn Rollback nötig:
--   1) Alle pages mit page_type='custom' vorab umtragen oder löschen
--   2) Enum komplett neu aufbauen via temporärer Spalte:
--      a) CREATE TYPE page_type_new AS ENUM ('question', 'submit', 'success');
--      b) ALTER TABLE pages ALTER COLUMN page_type TYPE page_type_new
--         USING page_type::text::page_type_new;
--      c) DROP TYPE page_type;
--      d) ALTER TYPE page_type_new RENAME TO page_type;
--
-- Diese Datei ist absichtlich nur Doku — manueller Eingriff nötig falls jemals
-- ernsthaft revertiert werden muss. Ein App-Code-Rollback (ohne Datenbank-Touch)
-- reicht meistens: solange das Frontend keine custom-Pages mehr erzeugt, ist
-- die Enum-Value einfach ungenutzt im Schema.

SELECT 1; -- no-op

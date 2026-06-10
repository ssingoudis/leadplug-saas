-- Aufgabe 57A — funnels.submit_button_label droppen.
--
-- Seit Aufgabe 52D (Submit-Page abgeschafft) gibt es keinen Submit-Button mehr,
-- dessen Label konfigurierbar wäre. Der seit 2026-06-10 deployte Code (Aufgaben 54-56)
-- liest und schreibt die Spalte nirgends mehr — sie ist reiner Schema-Ballast.
--
-- ⚠️ DEPLOY-REIHENFOLGE (Prod-Sicherheit): Nur anwenden, wenn der aktuelle Code live ist
-- (Stand 2026-06-10: erfüllt). Älterer Code mit submit_button_label in der
-- getTenantConfig-SELECT-Liste würde nach dem DROP bei jedem Widget-Load 500en.
--
-- Datenlage beim Drop (2026-06-10): nur 2 von allen Funnels hatten einen Wert,
-- beide das alte Standard-Label 'Anfrage absenden' (Snapshot im DOWN-File).
--
-- Rollback: 20260610180000_aufgabe_57a_drop_submit_button_label_DOWN.sql

ALTER TABLE funnels DROP COLUMN IF EXISTS submit_button_label;

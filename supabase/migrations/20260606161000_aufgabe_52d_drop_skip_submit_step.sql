-- Aufgabe 52D — funnels.skip_submit_step droppen.
--
-- Seit Aufgabe 52D referenziert KEIN Code die Spalte mehr (Submit-Page abgeschafft;
-- das Widget submitted immer am Funnel-Ende). Sie ist reiner Schema-Ballast.
--
-- ⚠️ DEPLOY-REIHENFOLGE (Prod-Sicherheit): Diese Migration ERST anwenden, NACHDEM der
-- 52D-Code auf Produktion live ist. Der alte Code (getTenantConfig SELECT-Liste) liest
-- skip_submit_step noch — bei zu frühem DROP würde jeder Widget-Load 500en.
--   1) 52D mergen + auf Vercel deployen
--   2) DANN diese Migration anwenden
--
-- Original (Aufgabe 35): skip_submit_step boolean NOT NULL DEFAULT false.
-- Rollback: 20260606161000_aufgabe_52d_drop_skip_submit_step_DOWN.sql

ALTER TABLE funnels DROP COLUMN IF EXISTS skip_submit_step;

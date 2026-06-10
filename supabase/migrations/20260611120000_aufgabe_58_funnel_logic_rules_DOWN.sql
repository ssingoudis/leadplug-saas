-- ROLLBACK für 20260611120000_aufgabe_58_funnel_logic_rules.sql
-- Achtung Reihenfolge: erst den Code zurückrollen (getTenantConfig liest die Tabelle
-- defensiv — überlebt das Droppen; die Logic-API-Routes + der PUT nutzen die RPC),
-- dann droppen. Alle Regeln gehen verloren (akzeptiert — Feature-Rollback).

BEGIN;

DROP FUNCTION IF EXISTS public.replace_page_logic_rules(uuid, uuid, jsonb);
DROP TABLE IF EXISTS public.funnel_logic_rules CASCADE;

COMMIT;

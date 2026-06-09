-- =============================================================================
-- Aufgabe 54 — Pre-Launch-Fixes (DOWN)
--
-- Achtung Reihenfolge: Erst den App-Code zurückrollen (PUT /api/tenant/funnels/
-- [slug] nutzt die RPC), DANN diese Migration anwenden — sonst schlägt jeder
-- Funnel-Save mit "function does not exist" fehl.
-- =============================================================================

drop function if exists public.replace_funnel_content(uuid, jsonb, jsonb);

drop index if exists public.idx_submissions_ip_completed;

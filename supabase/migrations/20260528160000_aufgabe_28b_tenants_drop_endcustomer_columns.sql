-- ============================================================================
-- Aufgabe 28 (Phase B.4) — tenants als reine Agentur-Account-Tabelle
-- Phase 2 (DROP only): die 4 endkunden-spezifischen Spalten droppen.
--
-- Voraussetzung: Migration 28a appliziert + Code-Deploy auf Vercel erfolgreich
--   (App-Code liest/schreibt diese Spalten nicht mehr — siehe Code-Refactor
--    in Commit 02e5f97 / Merge d741902).
--
-- Tenant-Verantwortlichkeit nach diesem Schritt: nur noch Agentur-Account-Daten
-- (Stripe-Felder, billing_*, company_name, is_active, website). Endkunden-Daten
-- (notification_email, footer_*) leben ausschließlich in funnels.
--
-- DOWN-Migration: siehe 20260528160000_..._DOWN.sql
-- ============================================================================

BEGIN;

ALTER TABLE public.tenants DROP COLUMN notification_email;
ALTER TABLE public.tenants DROP COLUMN public_email;
ALTER TABLE public.tenants DROP COLUMN public_phone;
ALTER TABLE public.tenants DROP COLUMN address;

COMMIT;

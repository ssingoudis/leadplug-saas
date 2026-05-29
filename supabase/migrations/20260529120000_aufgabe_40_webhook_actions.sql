-- Aufgabe 40 (2026-05-29): Webhook-Actions-Modell
--
-- Umbau von "globaler Tenant-Webhook" (Schema-Foundation aus Aufgabe 29 / B.6) zum
-- "Funnel-Action"-Modell (siehe Memory strategy_action_modell):
--
--   • webhook_subscriptions wird funnel-scoped (1 Funnel hat 1..N Webhooks)
--   • Pro Webhook konfigurierbarer Trigger: on_submit (Default) ODER after_page
--   • webhook_delivery_attempts kriegt Inspector-Spalten (response_status_code,
--     response_body) + Backoff-Spalte (next_retry_at)
--   • submissions kriegt abandoned_webhook_fired_at als Cooldown-Marker für
--     den Abbrecher-Cron (10-Min-Cooldown nach letzter Aktivität)
--
-- Da webhook_subscriptions + webhook_delivery_attempts seit Aufgabe 29 leer sind
-- (0 Zeilen), können wir direkt NOT NULL/CHECK-Constraints setzen — kein Backfill.
-- submissions hat Daten, daher hier additive Spalte ohne NOT NULL.
--
-- Begleit-Doku: siehe Memory strategy_action_modell + project_aktuelle_phase.

BEGIN;

-- ============================================================================
-- 1) webhook_subscriptions: funnel-scope + trigger-config
-- ============================================================================

ALTER TABLE public.webhook_subscriptions
  ADD COLUMN funnel_id uuid NOT NULL
    REFERENCES public.funnels(id) ON DELETE CASCADE,
  ADD COLUMN trigger_type text NOT NULL DEFAULT 'on_submit',
  ADD COLUMN trigger_page_id uuid NULL
    REFERENCES public.pages(id) ON DELETE SET NULL;

-- trigger_type Werte:
--   'on_submit'  → Webhook feuert nach erfolgreichem /api/submit (= completed-Path).
--                  Plus: vom Cron für submission.abandoned (10-Min-Cooldown), wenn
--                  effectiveContact email|telefon hat.
--   'after_page' → Webhook feuert nach Step-Advance über die Page mit
--                  trigger_page_id. Wird vom Widget über /api/track-progress
--                  als Side-Effect gefeuert (debounced + dedup pro Session).
ALTER TABLE public.webhook_subscriptions
  ADD CONSTRAINT webhook_subscriptions_trigger_type_check
    CHECK (trigger_type IN ('on_submit', 'after_page'));

-- Hinweis: KEIN Constraint "after_page → trigger_page_id NOT NULL", weil der
-- ON DELETE SET NULL auf trigger_page_id den Constraint bei Page-Löschung sonst
-- brechen würde. App-Layer + Sender skipped Webhook-Rows mit trigger_type='after_page'
-- AND trigger_page_id IS NULL (UI zeigt "Trigger-Page entfernt — bitte neu konfigurieren").

-- Tenant-ID bleibt erhalten für RLS-Performance (vermeidet zusätzlichen Join auf funnels
-- in jeder Policy). App-Code MUSS bei INSERT funnel_id.tenant_id == tenant_id sicherstellen.

CREATE INDEX idx_webhook_subscriptions_funnel_id
  ON public.webhook_subscriptions(funnel_id);

CREATE INDEX idx_webhook_subscriptions_trigger_page
  ON public.webhook_subscriptions(trigger_page_id)
  WHERE trigger_page_id IS NOT NULL;

-- ============================================================================
-- 2) webhook_delivery_attempts: Inspector + Backoff
-- ============================================================================

ALTER TABLE public.webhook_delivery_attempts
  ADD COLUMN next_retry_at timestamptz NULL,
  ADD COLUMN response_status_code integer NULL,
  ADD COLUMN response_body text NULL,
  ADD COLUMN event_type text NULL;
-- event_type ist 'submission.completed' / 'submission.abandoned' / 'webhook.test'
-- — wird beim INSERT vom Sender gesetzt, NULL nur in alten Zeilen (es gibt keine).

-- Neuer Retry-Queue-Index mit next_retry_at als Sortier-Spalte.
-- Alter Index idx_webhook_delivery_attempts_retry_queue (auf created_at) wird
-- vom DOWN-File wieder hergestellt; wir lassen ihn parallel stehen, damit alter
-- Sender-Code (falls jemals reaktiviert) nicht crashed.
CREATE INDEX idx_webhook_delivery_retry_due
  ON public.webhook_delivery_attempts(next_retry_at)
  WHERE status IN ('pending', 'retrying') AND next_retry_at IS NOT NULL;

-- response_body kann groß werden bei Tenant-CRMs die HTML zurückgeben.
-- App-Side truncieren wir auf ~4KB bevor wir schreiben.

-- ============================================================================
-- 3) submissions: abandoned-Cron-Marker
-- ============================================================================

ALTER TABLE public.submissions
  ADD COLUMN abandoned_webhook_fired_at timestamptz NULL;
-- NULL = abandoned-Webhook für diese Session noch nicht gefeuert.
-- Gesetzt = wurde gefeuert. Verhindert Doppel-Trigger im 5-Min-Cron.

-- Index für die Cron-Query: "finde Sessions die abgebrochen wurden, älter als 10 Min,
-- noch keinen abandoned-Webhook gefeuert haben". Partial damit der Index klein bleibt
-- (existierende completed-Submissions matchen nie).
CREATE INDEX idx_submissions_abandoned_pending
  ON public.submissions(created_at)
  WHERE completed_at IS NULL
    AND abandoned_webhook_fired_at IS NULL;

-- ============================================================================
-- 4) RLS-Anpassungen für webhook_subscriptions
-- ============================================================================
--
-- Bestehende Policies (aus Aufgabe 29) basieren auf tenant_id. Da wir das
-- behalten, müssen wir nichts ändern. App-Code stellt sicher, dass
-- funnel_id.tenant_id == tenant_id bei jedem INSERT.
--
-- delivery_attempts-Policies: keine Änderung. Schreibzugriff bleibt
-- Service-Key-only (Append-only Audit-Trail vom Sender).

COMMIT;

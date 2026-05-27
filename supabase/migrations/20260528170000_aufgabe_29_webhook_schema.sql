-- ============================================================================
-- Aufgabe 29 (Phase B.6) — Webhook-Schema (nur DDL, kein App-Code)
--
-- Foundation für Webhook-Tier-Launch (Phase C.5). In Phase B.6 wird NUR das
-- Schema angelegt — der Versand-Code (Delivery, Retry, Signatur-Generation)
-- kommt mit dem Webhook-Tier in Phase C.
--
-- Tabellen:
--   webhook_subscriptions      — Pro Tenant 1..N Webhooks
--   webhook_delivery_attempts  — Audit-Trail + Retry-Foundation
--
-- Tabellen sind initial leer (additive Migration, kein Backfill nötig).
-- DOWN-Migration: siehe ..._DOWN.sql
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. webhook_subscriptions
-- ----------------------------------------------------------------------------
CREATE TABLE public.webhook_subscriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  url          text NOT NULL,
  secret       text NOT NULL,
  event_types  text[] NOT NULL DEFAULT '{}',
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT webhook_subscriptions_url_check CHECK (url LIKE 'http%' AND length(url) >= 10),
  CONSTRAINT webhook_subscriptions_secret_min_length CHECK (length(secret) >= 16)
);

COMMENT ON TABLE  public.webhook_subscriptions IS 'Pro Tenant 1..N Webhook-Endpoints, an die Events geliefert werden.';
COMMENT ON COLUMN public.webhook_subscriptions.url IS 'HTTPS-Endpoint (http nur für lokale Tests). Wird mit POST + JSON-Body + HMAC-Signatur gerufen.';
COMMENT ON COLUMN public.webhook_subscriptions.secret IS 'HMAC-Signing-Secret. App-generated bei Create, UI darf Wert nur 1x anzeigen.';
COMMENT ON COLUMN public.webhook_subscriptions.event_types IS 'Liste der abonnierten Event-Types, z.B. {"submission.created"}.';

CREATE INDEX idx_webhook_subscriptions_tenant_id ON public.webhook_subscriptions(tenant_id);
CREATE INDEX idx_webhook_subscriptions_active ON public.webhook_subscriptions(tenant_id, is_active) WHERE is_active = true;

-- updated_at-Trigger
CREATE TRIGGER webhook_subscriptions_updated_at
  BEFORE UPDATE ON public.webhook_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ----------------------------------------------------------------------------
-- 2. webhook_delivery_attempts
-- ----------------------------------------------------------------------------
CREATE TABLE public.webhook_delivery_attempts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.webhook_subscriptions(id) ON DELETE CASCADE,
  submission_id   uuid REFERENCES public.submissions(id) ON DELETE SET NULL,
  attempt_count   integer NOT NULL DEFAULT 1,
  status          text NOT NULL DEFAULT 'pending',
  last_error      text,
  delivered_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT webhook_delivery_attempts_status_check
    CHECK (status IN ('pending', 'retrying', 'success', 'failed')),
  CONSTRAINT webhook_delivery_attempts_attempt_count_positive
    CHECK (attempt_count >= 1),
  CONSTRAINT webhook_delivery_attempts_delivered_when_success
    CHECK ((status = 'success' AND delivered_at IS NOT NULL) OR status <> 'success')
);

COMMENT ON TABLE  public.webhook_delivery_attempts IS 'Audit-Trail jeder Webhook-Zustellungs-Versuche. Append-only (kein UPDATE durch User-Client).';
COMMENT ON COLUMN public.webhook_delivery_attempts.status IS 'pending|retrying|success|failed';
COMMENT ON COLUMN public.webhook_delivery_attempts.submission_id IS 'ON DELETE SET NULL: Audit-Eintrag bleibt erhalten auch wenn Submission gelöscht.';

CREATE INDEX idx_webhook_delivery_attempts_subscription ON public.webhook_delivery_attempts(subscription_id, created_at DESC);
CREATE INDEX idx_webhook_delivery_attempts_submission ON public.webhook_delivery_attempts(submission_id) WHERE submission_id IS NOT NULL;
-- Retry-Queue: nur pending/retrying scannen
CREATE INDEX idx_webhook_delivery_attempts_retry_queue ON public.webhook_delivery_attempts(created_at) WHERE status IN ('pending', 'retrying');

-- ----------------------------------------------------------------------------
-- 3. RLS — webhook_subscriptions
-- ----------------------------------------------------------------------------
-- ENABLE RLS passiert automatisch via Event-Trigger rls_auto_enable() —
-- wir verlassen uns auf das Default-Verhalten, statt es hier zu duplizieren.

CREATE POLICY webhook_subscriptions_select ON public.webhook_subscriptions
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.current_tenant_ids()));

CREATE POLICY webhook_subscriptions_insert ON public.webhook_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (public.current_tenant_role(tenant_id) IN ('owner', 'admin'));

CREATE POLICY webhook_subscriptions_update ON public.webhook_subscriptions
  FOR UPDATE TO authenticated
  USING (public.current_tenant_role(tenant_id) IN ('owner', 'admin'))
  WITH CHECK (public.current_tenant_role(tenant_id) IN ('owner', 'admin'));

CREATE POLICY webhook_subscriptions_delete ON public.webhook_subscriptions
  FOR DELETE TO authenticated
  USING (public.current_tenant_role(tenant_id) = 'owner');

-- ----------------------------------------------------------------------------
-- 4. RLS — webhook_delivery_attempts (SELECT only für User-Clients)
-- ----------------------------------------------------------------------------
-- INSERT/UPDATE/DELETE durch Service-Key (Webhook-Sender wird System-Code).

CREATE POLICY webhook_delivery_attempts_select ON public.webhook_delivery_attempts
  FOR SELECT TO authenticated
  USING (
    subscription_id IN (
      SELECT id FROM public.webhook_subscriptions
      WHERE tenant_id IN (SELECT public.current_tenant_ids())
    )
  );

COMMIT;

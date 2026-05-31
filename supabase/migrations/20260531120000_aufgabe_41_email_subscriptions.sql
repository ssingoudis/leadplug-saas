-- ============================================================================
-- Aufgabe 41 (2026-05-31): E-Mails als Drip-Action-Element (Lead-Nurturing)
--
-- Macht den bisher hartkodierten Mail-Versand in /api/submit dynamisch und
-- modelliert E-Mails als Drip-System (zeitversetzte Mail-Sequenz nach Submit):
--   • Pro Funnel N email_subscriptions mit delay_minutes (0 = sofort, N = später)
--   • Recipient: customer | tenant (custom kommt erst bei Bedarf)
--   • Body: WYSIWYG-HTML mit Variable-Chips + Magic-Section-Blöcken
--   • Sender: bei Submit werden N email_delivery_attempts-Rows mit
--     scheduled_at = NOW() + delay_minutes angelegt. Sofort-Mails (delay=0)
--     werden via after() direkt versendet, delayed via Cron-Queue.
--
-- Architektur-Konsens (siehe Memory strategy_action_modell):
-- E-Mails sind anders als Webhooks: Webhooks = Event-Push (after_page macht Sinn),
-- E-Mails = Lead-Nurturing-Sequenz. Daher KEIN after_page / on_abandoned bei Mails.
--
-- Backwards-Compat: für jeden bestehenden Funnel werden 2 Default-Subscriptions
-- angelegt (Customer-Bestätigung sofort + Tenant-Benachrichtigung sofort) —
-- reproduziert das heutige hartkodierte Verhalten 1:1.
--
-- DOWN-Migration: siehe ..._DOWN.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1) email_subscriptions
-- ============================================================================

CREATE TABLE public.email_subscriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id       uuid NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  name            text NOT NULL,

  -- Empfänger
  recipient_type  text NOT NULL,

  -- Drip-Trigger: 0 = sofort, N = N Minuten nach completed_at
  delay_minutes   integer NOT NULL DEFAULT 0,

  -- Inhalt
  subject         text NOT NULL,
  body_html       text NOT NULL,
  from_local      text NULL,

  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT email_subscriptions_recipient_type_check
    CHECK (recipient_type IN ('customer', 'tenant')),
  CONSTRAINT email_subscriptions_delay_nonneg
    CHECK (delay_minutes >= 0),
  CONSTRAINT email_subscriptions_subject_not_empty
    CHECK (length(trim(subject)) >= 1),
  CONSTRAINT email_subscriptions_body_not_empty
    CHECK (length(trim(body_html)) >= 1),
  CONSTRAINT email_subscriptions_name_not_empty
    CHECK (length(trim(name)) >= 1)
);

COMMENT ON TABLE  public.email_subscriptions IS
  'Pro Funnel 1..N Drip-Mails (Action-Element-Modell, Aufgabe 41).';
COMMENT ON COLUMN public.email_subscriptions.delay_minutes IS
  '0 = direkt nach Submit (via after()). N>0 = N Minuten später (via Cron-Queue).';
COMMENT ON COLUMN public.email_subscriptions.recipient_type IS
  'customer = contact.email aus Submission. tenant = funnels.notification_email.';
COMMENT ON COLUMN public.email_subscriptions.body_html IS
  'TipTap-WYSIWYG-Output (HTML mit data-variable / data-magic-section-Spans). Server-Side beim Send durch Werte ersetzt.';

CREATE INDEX idx_email_subscriptions_funnel_id
  ON public.email_subscriptions(funnel_id);
CREATE INDEX idx_email_subscriptions_funnel_active
  ON public.email_subscriptions(funnel_id, is_active)
  WHERE is_active = true;

CREATE TRIGGER email_subscriptions_updated_at
  BEFORE UPDATE ON public.email_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- 2) email_delivery_attempts (Queue + Audit-Trail)
-- ============================================================================

CREATE TABLE public.email_delivery_attempts (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id      uuid NOT NULL REFERENCES public.email_subscriptions(id) ON DELETE CASCADE,
  submission_id        uuid REFERENCES public.submissions(id) ON DELETE SET NULL,
  scheduled_at         timestamptz NOT NULL,
  attempt_count        integer NOT NULL DEFAULT 0,
  status               text NOT NULL DEFAULT 'pending',
  last_error           text,
  resend_message_id    text,
  recipient_address    text,
  delivered_at         timestamptz,
  next_retry_at        timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT email_delivery_attempts_status_check
    CHECK (status IN ('pending', 'retrying', 'success', 'failed')),
  CONSTRAINT email_delivery_attempts_attempt_count_nonneg
    CHECK (attempt_count >= 0),
  CONSTRAINT email_delivery_attempts_delivered_when_success
    CHECK ((status = 'success' AND delivered_at IS NOT NULL) OR status <> 'success')
);

COMMENT ON TABLE  public.email_delivery_attempts IS
  'Drip-Queue + Audit-Trail. Beim Submit insertet, vom Cron + after() picked + versendet.';
COMMENT ON COLUMN public.email_delivery_attempts.scheduled_at IS
  '= submission.completed_at + delay_minutes (geplanter Send-Zeitpunkt).';
COMMENT ON COLUMN public.email_delivery_attempts.attempt_count IS
  '0 = noch nicht versucht. 1+ = Anzahl Send-Versuche (inkl. erfolgloser).';

CREATE INDEX idx_email_delivery_attempts_subscription
  ON public.email_delivery_attempts(subscription_id, created_at DESC);
CREATE INDEX idx_email_delivery_attempts_submission
  ON public.email_delivery_attempts(submission_id)
  WHERE submission_id IS NOT NULL;
-- Queue-Index: alle pending Mails, deren Zeit gekommen ist.
CREATE INDEX idx_email_delivery_due
  ON public.email_delivery_attempts(scheduled_at)
  WHERE status = 'pending';
-- Retry-Index: Mails in Backoff-Loop.
CREATE INDEX idx_email_delivery_retry_due
  ON public.email_delivery_attempts(next_retry_at)
  WHERE status = 'retrying' AND next_retry_at IS NOT NULL;

-- ============================================================================
-- 3) RLS — email_subscriptions
-- ============================================================================

CREATE POLICY email_subscriptions_select ON public.email_subscriptions
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.current_tenant_ids()));

CREATE POLICY email_subscriptions_insert ON public.email_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (public.current_tenant_role(tenant_id) IN ('owner', 'admin'));

CREATE POLICY email_subscriptions_update ON public.email_subscriptions
  FOR UPDATE TO authenticated
  USING (public.current_tenant_role(tenant_id) IN ('owner', 'admin'))
  WITH CHECK (public.current_tenant_role(tenant_id) IN ('owner', 'admin'));

CREATE POLICY email_subscriptions_delete ON public.email_subscriptions
  FOR DELETE TO authenticated
  USING (public.current_tenant_role(tenant_id) = 'owner');

-- ============================================================================
-- 4) RLS — email_delivery_attempts (SELECT only)
-- ============================================================================

CREATE POLICY email_delivery_attempts_select ON public.email_delivery_attempts
  FOR SELECT TO authenticated
  USING (
    subscription_id IN (
      SELECT id FROM public.email_subscriptions
      WHERE tenant_id IN (SELECT public.current_tenant_ids())
    )
  );

-- ============================================================================
-- 5) Backfill: 2 Default-Subscriptions pro existierendem Funnel
--
-- Reproduziert das heutige hartkodierte Mail-Verhalten 1:1:
--   • Customer-Confirmation an contact.email (delay=0 = sofort)
--   • Tenant-Notification an funnels.notification_email (delay=0 = sofort)
--
-- body_html ist TipTap-kompatibles HTML mit data-magic-section / data-variable
-- Attributes. Renderer (lib/emailTemplates.ts) ersetzt die Tokens beim Send.
-- ============================================================================

INSERT INTO public.email_subscriptions (
  funnel_id, tenant_id, name, recipient_type, delay_minutes,
  subject, body_html, is_active
)
SELECT
  f.id,
  f.tenant_id,
  'Bestätigung an Kunde',
  'customer',
  0,
  'Ihre Anfrage bei <span data-variable="funnel.name">{{funnel.name}}</span>',
  '<p>Vielen Dank, <span data-variable="contact.name">{{contact.name}}</span>!</p>'
  || '<p><span data-variable="funnel.success_message">{{funnel.success_message}}</span></p>'
  || '<p><span data-variable="funnel.response_message">{{funnel.response_message}}</span></p>'
  || '<div data-magic-section="answers_overview"></div>'
  || '<hr />'
  || '<p><strong>Ihr Ansprechpartner:</strong><br />'
  || '<span data-variable="funnel.name">{{funnel.name}}</span><br />'
  || '<span data-variable="funnel.phone">{{funnel.phone}}</span><br />'
  || '<span data-variable="funnel.email">{{funnel.email}}</span></p>',
  true
FROM public.funnels f;

INSERT INTO public.email_subscriptions (
  funnel_id, tenant_id, name, recipient_type, delay_minutes,
  subject, body_html, is_active
)
SELECT
  f.id,
  f.tenant_id,
  'Lead-Benachrichtigung an Tenant',
  'tenant',
  0,
  'Neue Anfrage von <span data-variable="contact.name">{{contact.name}}</span>',
  '<p><strong>Neue Anfrage eingegangen!</strong></p>'
  || '<p>Eingegangen: <span data-variable="submitted_at">{{submitted_at}}</span></p>'
  || '<div data-magic-section="contact_summary"></div>'
  || '<div data-magic-section="answers_overview"></div>'
  || '<div data-magic-section="dashboard_button"></div>',
  true
FROM public.funnels f;

COMMIT;

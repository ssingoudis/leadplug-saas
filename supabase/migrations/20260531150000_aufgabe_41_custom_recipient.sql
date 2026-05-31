-- Aufgabe 41 Polish (2026-05-31): Custom-Empfänger für E-Mail-Drip
--
-- Erweitert email_subscriptions um:
--   • recipient_type 'custom' (zusätzlich zu 'customer' / 'tenant')
--   • recipient_value text NULL — Custom-Email-Adresse
--   • CHECK: bei recipient_type='custom' muss recipient_value gefüllt sein
--
-- Additive Migration, kein Backfill (24 Bestands-Subscriptions haben
-- recipient_type ∈ {'customer','tenant'} → bleiben unverändert gültig).
-- DOWN: siehe ..._DOWN.sql

BEGIN;

ALTER TABLE public.email_subscriptions
  DROP CONSTRAINT email_subscriptions_recipient_type_check;

ALTER TABLE public.email_subscriptions
  ADD CONSTRAINT email_subscriptions_recipient_type_check
    CHECK (recipient_type IN ('customer', 'tenant', 'custom'));

ALTER TABLE public.email_subscriptions
  ADD COLUMN recipient_value text NULL;

ALTER TABLE public.email_subscriptions
  ADD CONSTRAINT email_subscriptions_custom_has_recipient
    CHECK (
      recipient_type <> 'custom'
      OR (recipient_value IS NOT NULL AND length(trim(recipient_value)) > 0)
    );

COMMENT ON COLUMN public.email_subscriptions.recipient_value IS
  'Custom-Empfänger-E-Mail-Adresse (1 Adresse). NULL für recipient_type=customer/tenant.';

COMMIT;

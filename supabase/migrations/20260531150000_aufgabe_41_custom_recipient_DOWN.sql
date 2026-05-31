-- DOWN-Migration für Aufgabe 41 Polish: Custom-Empfänger
--
-- WARNUNG: dropt alle Subscriptions mit recipient_type='custom' VOR dem
-- Constraint-Revert — sonst schlägt die CHECK-Einschränkung fehl.

BEGIN;

-- Sicherheits-Hinweis: dies löscht alle custom-Subscriptions. Wenn welche
-- erhalten bleiben sollen, vorher in 'tenant' ändern + recipient_value in
-- notification_email migrieren.
DELETE FROM public.email_subscriptions WHERE recipient_type = 'custom';

ALTER TABLE public.email_subscriptions
  DROP CONSTRAINT IF EXISTS email_subscriptions_custom_has_recipient;

ALTER TABLE public.email_subscriptions
  DROP COLUMN IF EXISTS recipient_value;

ALTER TABLE public.email_subscriptions
  DROP CONSTRAINT email_subscriptions_recipient_type_check;

ALTER TABLE public.email_subscriptions
  ADD CONSTRAINT email_subscriptions_recipient_type_check
    CHECK (recipient_type IN ('customer', 'tenant'));

COMMIT;

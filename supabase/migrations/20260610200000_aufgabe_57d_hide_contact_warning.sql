-- Aufgabe 57D — Kontaktierbarkeits-Warnung im Editor ausblendbar machen.
--
-- Stavros-Feedback: die Warnbox („Kein E-Mail-/Telefon-Pflichtfeld") ist groß und
-- permanent — wer bewusst einen anonymen Quiz-Funnel baut (seit Aufgabe 56 erlaubt),
-- sieht sie für immer. Sie muss wegklickbar sein; danach bleibt ein dezenter
-- Erinnerungs-Marker in der Canvas-Controls-Zeile.
--
-- Persistenz pro Funnel in der DB (nicht localStorage): die Entscheidung „dieser
-- Funnel ist absichtlich ohne Kontaktfeld" gilt geräte- und teamübergreifend.
-- Bewusst NICHT Teil des EditorState/Undo-Modells — Wegklicken wirkt sofort via
-- eigenem PATCH (/api/tenant/funnels/[slug]/contact-warning), kein Save nötig.
--
-- Additiv, Default false (= Warnung sichtbar, heutiges Verhalten).
-- Rollback: 20260610200000_aufgabe_57d_hide_contact_warning_DOWN.sql

ALTER TABLE public.funnels
  ADD COLUMN hide_contact_warning boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.funnels.hide_contact_warning IS
  'Aufgabe 57D: true = Tenant hat die Kontaktierbarkeits-Warnung im Editor für diesen Funnel quittiert (nur dezenter Marker statt Banner).';

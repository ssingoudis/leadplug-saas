-- Aufgabe 40 (2026-05-29 Polish): Name-Field-Types als first-class Field-Types.
--
-- Hintergrund: Skip-Mode-Funnels (kein Kontaktformular) brauchen verlässliche
-- Möglichkeit, Name auf Server-Seite ins contact-jsonb zu mappen. Bisher
-- nutzte deriveContactFromAnswers einen Key-Pattern-Match ("name" im key),
-- was bei auto-generierten Keys wie "wie-heisst-du" versagte.
--
-- Drei neue Field-Types:
--   first_name → contact.firstName
--   last_name  → contact.lastName
--   full_name  → contact.name
--
-- Wenn first_name + last_name beide gesetzt, aggregiert der Sender
-- contact.name = firstName + " " + lastName.
--
-- Additive Migration. Forward-only — PG erlaubt kein DROP VALUE auf Enum.

ALTER TYPE public.field_type ADD VALUE IF NOT EXISTS 'first_name';
ALTER TYPE public.field_type ADD VALUE IF NOT EXISTS 'last_name';
ALTER TYPE public.field_type ADD VALUE IF NOT EXISTS 'full_name';

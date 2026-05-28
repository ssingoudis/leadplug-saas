-- Aufgabe 38: Custom Multi-Field-Pages
-- Erweitert die page_type-Enum um 'custom' — generische Multi-Field-Karte, die
-- der Tenant überall im Funnel platzieren kann (= heute künstlich limitiert auf
-- die einzige submit-Page am Ende).
--
-- Backward-kompatibel: bestehende Pages bleiben unverändert auf ihren Werten
-- (question / submit / success). Frontend kann ab sofort 'custom' setzen.
--
-- Speicherung der Antworten: Custom-Page-Field-Antworten landen in
-- submissions.answers jsonb (gleich wie question-Pages), keyed by field_key.
-- contact jsonb bleibt der Submit-Page vorbehalten für Backward-Compat
-- mit Mail-Versand-Logik.

ALTER TYPE page_type ADD VALUE IF NOT EXISTS 'custom';

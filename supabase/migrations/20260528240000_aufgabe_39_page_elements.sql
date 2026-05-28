-- Aufgabe 39: Page+Elements-Unification + neue Element-Types + Welcome/End-Screen.
--
-- Strategischer Shift: Pages werden zu reinen Element-Containern. Bestehende
-- question-Pages behalten ihre Struktur (1 Field), kriegen aber ihren Titel
-- + Subtitle aus field.label/subtitle in pages.config kopiert — damit das Widget
-- für ALLE Page-Typen denselben Render-Pfad nehmen kann (page.config.title als
-- big-heading, dann N Elements).
--
-- Additive Änderungen, keine Down-Time, Backward-Compat bleibt:
-- - bestehende Funnels rendern weiterhin korrekt
-- - App-Code-Switch von "question-page-mit-1-Field-als-Title" zu
--   "page.config.title + N elements" passiert im Editor + Widget, nicht hier.

-- 1. Neue page_type-Werte: welcome (= optionaler Intro-Step am Anfang)
ALTER TYPE page_type ADD VALUE IF NOT EXISTS 'welcome';

-- 2. Neue field_type-Werte für die zusätzlichen Element-Types
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'rating';     -- 1-5 Sterne mit hover
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'scale';      -- 0-N Skala (NPS-Style)
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'statement';  -- Info-Block ohne Input

-- 3. Funnel-weite Redirect-URL (End-Screen-Redirect-Modus).
-- NULL = Content-Modus (Success-Page wird gerendert). Wert = window.location.replace nach Submit.
ALTER TABLE funnels
  ADD COLUMN IF NOT EXISTS redirect_url text;

COMMENT ON COLUMN funnels.redirect_url IS
  'Aufgabe 39: wenn gesetzt, leitet das Widget nach erfolgreichem Submit auf diese URL um (statt Success-Page zu zeigen). NULL = Default Content-Modus.';

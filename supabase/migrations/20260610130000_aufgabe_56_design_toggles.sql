-- =============================================================================
-- Aufgabe 56 — Design-Schalter (UP)
--
-- Drei kuratierte Anzeige-Optionen pro Funnel (Design-Tab im Editor):
--   • show_progress_bar — dünner Fortschrittsbalken oben an der Card (Default an)
--   • show_step_badge   — Schritt-Nummern-Chip über der Frage (Default an)
--   • title_alignment   — Überschriften links (Default) oder mittig
--
-- Additiv, NOT NULL mit Default → bestehende Funnels behalten exakt das heutige
-- Verhalten; alter deployter Code selektiert Spalten explizit und ist unberührt.
--
-- Rollback: 20260610130000_aufgabe_56_design_toggles_DOWN.sql
-- =============================================================================

ALTER TABLE funnels
  ADD COLUMN show_progress_bar boolean NOT NULL DEFAULT true,
  ADD COLUMN show_step_badge boolean NOT NULL DEFAULT true,
  ADD COLUMN title_alignment text NOT NULL DEFAULT 'left'
    CONSTRAINT funnels_title_alignment_check CHECK (title_alignment IN ('left', 'center'));

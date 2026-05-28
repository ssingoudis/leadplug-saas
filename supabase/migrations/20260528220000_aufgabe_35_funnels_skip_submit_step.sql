-- Aufgabe 35: Submit-Schritt optional machen.
-- Tenants können auf der Submit-Page-Properties einen Toggle ausschalten, dann
-- endet der Funnel direkt nach der letzten Question-Page (Auto-Finish + Success-Page).
-- Bestehende Funnels bleiben auf false (= Submit-Page wird gerendert, kein Verhalten-Drift).

ALTER TABLE funnels
  ADD COLUMN IF NOT EXISTS skip_submit_step boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN funnels.skip_submit_step IS
  'Aufgabe 35: wenn true, überspringt das Widget die Submit-Page (Auto-Finish nach letzter Question-Page). Default false = Submit-Page wird gerendert.';

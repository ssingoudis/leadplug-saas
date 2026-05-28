-- Aufgabe 34: Icons komplett aus dem System raus.
-- `fields.options` jsonb hat bisher pro Option ein {label, value, icon_key, icon_url, sort_order}.
-- Diese Migration strippt icon_key + icon_url aus allen bestehenden Optionen.
-- Forward-only: kein DOWN-Pfad weil die alten Werte nicht mehr benötigt werden (Brand-Decision 2026-05-28).
-- Falls Rollback nötig: das DB-Auto-Backup vor diesem Apply-Zeitpunkt einspielen.

UPDATE fields
SET options = (
  SELECT COALESCE(jsonb_agg(o - 'icon_key' - 'icon_url' ORDER BY (o->>'sort_order')::int NULLS LAST), '[]'::jsonb)
  FROM jsonb_array_elements(options) o
)
WHERE jsonb_typeof(options) = 'array'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(options) o
    WHERE o ? 'icon_key' OR o ? 'icon_url'
  );

-- Verifikation: 0 Optionen sollten noch icon_key oder icon_url haben
DO $$
DECLARE
  remaining int;
BEGIN
  SELECT COUNT(*) INTO remaining
  FROM fields f, jsonb_array_elements(f.options) o
  WHERE jsonb_typeof(f.options) = 'array' AND (o ? 'icon_key' OR o ? 'icon_url');
  IF remaining > 0 THEN
    RAISE EXCEPTION 'Migration nicht vollständig: noch % Option-Einträge mit icon_key/icon_url', remaining;
  END IF;
END $$;

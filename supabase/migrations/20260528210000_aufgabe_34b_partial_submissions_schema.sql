-- Aufgabe 34 Phase A: Partial-Submissions-Schema
-- Strategischer Shift weg vom "Submit-Only-Save" hin zu "fortlaufender Persistenz".
-- Jede submissions-Row repräsentiert jetzt eine Session (= ein User-Funnel-Durchlauf).
-- session_id: client-generierte UUID die per UPSERT angesprochen wird (idempotent bei Reload-Race)
-- completed_at: NULL = User noch nicht durch / abgebrochen, gesetzt = User hat finalen Submit ausgelöst

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS session_id uuid,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz NULL;

-- Backfill: bestehende Rows sind alle "fertig" → completed_at = created_at, session_id = id (random aber stabil pro Row)
UPDATE submissions
SET
  session_id = COALESCE(session_id, id),
  completed_at = COALESCE(completed_at, created_at, NOW())
WHERE session_id IS NULL OR completed_at IS NULL;

-- Nachdem alle Rows session_id haben: NOT NULL erzwingen + Unique-Constraint für UPSERT.
ALTER TABLE submissions
  ALTER COLUMN session_id SET NOT NULL,
  ADD CONSTRAINT submissions_session_id_unique UNIQUE (session_id);

-- Index für Filter-Queries im Lead-Inbox: WHERE completed_at IS NULL / IS NOT NULL.
CREATE INDEX IF NOT EXISTS submissions_completed_at_idx
  ON submissions(tenant_id, completed_at NULLS FIRST);

-- Index für common Inbox-Query "all abandoned with email" → partial index auf contact->>'email' bei completed_at NULL
CREATE INDEX IF NOT EXISTS submissions_abandoned_with_email_idx
  ON submissions(tenant_id, created_at DESC)
  WHERE completed_at IS NULL AND contact->>'email' IS NOT NULL AND contact->>'email' <> '';

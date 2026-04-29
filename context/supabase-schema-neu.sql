-- ============================================================
-- widget-funnel – Supabase Schema (neu)
-- Idempotent: safe to re-run
-- ============================================================

-- ============================================================
-- INDUSTRIES (Lookup-Tabelle)
-- ============================================================
CREATE TABLE IF NOT EXISTS industries (
  label      TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  id         TEXT PRIMARY KEY
);

INSERT INTO industries (id, label, sort_order) VALUES
  ('solar',       'Solar',      1),
  ('waermepumpe', 'Wärmepumpe', 2),
  ('heizung',     'Heizung',    3),
  ('sanitaer',    'Sanitär',    4),
  ('elektro',     'Elektro',    5),
  ('general',     'Allgemein',  99)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- TENANTS (Kunden – Stammdaten + Billing)
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
  -- Identifikation
  slug                    TEXT UNIQUE NOT NULL,   -- z.B. "mustermann-solar"
  company_name            TEXT NOT NULL,
  is_active               BOOLEAN DEFAULT TRUE,

  -- Kontakt (öffentlich / kundengerichtet)
  public_email            TEXT NOT NULL,
  public_phone            TEXT,

  -- Kontakt (intern)
  notification_email      TEXT NOT NULL,
  billing_email           TEXT,                   -- NULL = fällt auf notification_email zurück
  company_phone           TEXT,
  address                 TEXT,
  website                 TEXT,

  -- Ansprechpartner
  owner_name              TEXT,
  owner_email             TEXT,
  owner_phone             TEXT,

  -- Billing
  billing_model           TEXT NOT NULL DEFAULT 'per_lead'
                            CHECK (billing_model IN ('per_lead', 'flat_monthly')),
  lead_price_base         NUMERIC(10,2) DEFAULT 3.00,
  flat_monthly_price      NUMERIC(10,2),
  flat_monthly_lead_limit INTEGER,
  stripe_customer_id      TEXT,

  -- Meta
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY
);

-- ============================================================
-- THEMES (Design-Konfiguration, wiederverwendbar)
-- ============================================================
CREATE TABLE IF NOT EXISTS themes (
  name                  TEXT UNIQUE NOT NULL,      -- lesbarer Identifier, z.B. "Mustermann Grün"
  tenant_slug           TEXT REFERENCES tenants(slug) ON DELETE CASCADE,
                                                   -- NULL = globale Vorlage
  primary_color         TEXT NOT NULL DEFAULT '#22c55e',
  text_color            TEXT DEFAULT '#1f2937',
  background_color      TEXT DEFAULT '#ffffff',
  page_background_color TEXT DEFAULT 'transparent',
  font                  TEXT DEFAULT 'system'
                          CHECK (font IN ('system', 'inter', 'poppins', 'roboto')),
  border_radius         TEXT DEFAULT '0.5rem',
  max_width             TEXT DEFAULT '720px',

  -- Meta
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY
);

-- Globale Vorlagen (tenant_slug = NULL)
INSERT INTO themes (id, name, tenant_slug, primary_color) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Standard Grün',   NULL, '#22c55e'),
  ('00000000-0000-0000-0000-000000000002', 'Standard Blau',   NULL, '#2563eb'),
  ('00000000-0000-0000-0000-000000000003', 'Standard Orange', NULL, '#f97316')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FUNNELS (Das Widget – Slug, Branche, Texte, Theme)
-- ============================================================
CREATE TABLE IF NOT EXISTS funnels (
  slug                  TEXT UNIQUE NOT NULL,      -- URL-Identifier, z.B. "mustermann-solar"
  is_active             BOOLEAN DEFAULT TRUE,
  industry              TEXT NOT NULL REFERENCES industries(id),
  tenant_slug           TEXT NOT NULL REFERENCES tenants(slug) ON DELETE CASCADE,
  theme_name            TEXT REFERENCES themes(name) ON DELETE SET NULL,

  -- Konfigurierbare Texte (NULL = generischer Default im Code)
  funnel_title          TEXT,                      -- Default: "Jetzt kostenloses Angebot anfordern"
  submit_button_label   TEXT,                      -- Default: "Anfrage absenden"
  success_message       TEXT,                      -- Default: "Vielen Dank! Wir melden uns in Kürze bei Ihnen."
  email_sender_local    TEXT,
  response_time_text    TEXT,                      -- Default: "24 Stunden"
  contact_form_subtitle TEXT,                      -- Default: "Wer soll das Angebot erhalten?"
  privacy_text          TEXT,
  privacy_policy_url    TEXT DEFAULT '#',

  -- Meta
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY
);

-- ============================================================
-- FUNNEL QUESTIONS (inkl. Antwortoptionen als JSONB)
--
-- options-Format (Array, Reihenfolge = Anzeigereihenfolge):
-- [
--   { "label": "Einfamilienhaus", "value": "einfamilienhaus", "icon_key": "House" },
--   { "label": "Mehrfamilienhaus", "value": "mehrfamilienhaus", "icon_url": "https://..." }
-- ]
-- ============================================================
CREATE TABLE IF NOT EXISTS funnel_questions (
  question_key TEXT NOT NULL,
  title        TEXT NOT NULL,
  options      JSONB NOT NULL DEFAULT '[]',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  visible      BOOLEAN DEFAULT TRUE,
  funnel_slug  TEXT NOT NULL REFERENCES funnels(slug) ON DELETE CASCADE,
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  UNIQUE (funnel_slug, question_key)
);

-- ============================================================
-- SUBMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS submissions (
  -- Kontaktdaten
  contact_name        TEXT NOT NULL,
  contact_email       TEXT NOT NULL,
  contact_phone       TEXT,

  -- Funnel-Antworten
  answers             JSONB NOT NULL,

  -- Herkunft (Snapshots – historisch korrekt auch wenn Slugs sich ändern)
  funnel_slug         TEXT NOT NULL,
  tenant_slug         TEXT NOT NULL,

  -- Billing-Snapshot
  lead_price          NUMERIC(10,2) NOT NULL DEFAULT 0,
  billed              BOOLEAN DEFAULT FALSE,
  billed_at           TIMESTAMP WITH TIME ZONE,

  -- Tracking
  source_url          TEXT,
  user_agent          TEXT,
  honeypot_triggered  BOOLEAN DEFAULT FALSE,
  emails_sent         BOOLEAN DEFAULT FALSE,

  -- Meta
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tenants_slug
  ON tenants(slug) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_funnels_slug
  ON funnels(slug) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_funnels_tenant
  ON funnels(tenant_slug);

CREATE INDEX IF NOT EXISTS idx_funnel_questions_funnel
  ON funnel_questions(funnel_slug, sort_order);

CREATE INDEX IF NOT EXISTS idx_submissions_funnel
  ON submissions(funnel_slug, created_at);

CREATE INDEX IF NOT EXISTS idx_submissions_tenant
  ON submissions(tenant_slug, created_at);

CREATE INDEX IF NOT EXISTS idx_submissions_billing
  ON submissions(tenant_slug, billed, created_at) WHERE honeypot_triggered = FALSE;

-- ============================================================
-- updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER themes_updated_at
  BEFORE UPDATE ON themes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER funnels_updated_at
  BEFORE UPDATE ON funnels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- MONTHLY BILLING VIEW
-- ============================================================
CREATE OR REPLACE VIEW monthly_billing AS
SELECT
  t.slug                                                       AS tenant_slug,
  t.company_name,
  t.billing_model,
  DATE_TRUNC('month', s.created_at)                            AS month,
  COUNT(*)                                                      AS submission_count,
  t.flat_monthly_lead_limit,
  GREATEST(0, COUNT(*) - COALESCE(t.flat_monthly_lead_limit, COUNT(*)))
                                                                AS overage_leads,
  CASE
    WHEN t.billing_model = 'flat_monthly'
      THEN COALESCE(t.flat_monthly_price, 0)
    ELSE SUM(s.lead_price)
  END                                                           AS amount_eur,
  SUM(CASE WHEN s.billed THEN 1 ELSE 0 END)                    AS already_billed
FROM submissions s
JOIN tenants t ON s.tenant_slug = t.slug
WHERE s.honeypot_triggered = FALSE
GROUP BY
  t.slug, t.company_name, t.billing_model,
  t.flat_monthly_price, t.flat_monthly_lead_limit,
  DATE_TRUNC('month', s.created_at)
ORDER BY month DESC, t.company_name;

-- ============================================================
-- RLS (Row Level Security)
-- Service Key bypassed RLS vollständig – App funktioniert unverändert.
-- Anon Key: kein Zugriff auf nichts (secure by default).
-- ============================================================
ALTER TABLE industries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnels          ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions      ENABLE ROW LEVEL SECURITY;

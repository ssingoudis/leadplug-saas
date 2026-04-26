-- ============================================================
-- widget-funnel – Supabase Schema v2
-- Neues Projekt: widget-funnel
-- Idempotent: safe to re-run
-- ============================================================

-- ============================================================
-- INDUSTRIES (Lookup-Tabelle)
-- ============================================================
CREATE TABLE IF NOT EXISTS industries (
  id         TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active  BOOLEAN DEFAULT TRUE
);

INSERT INTO industries (id, label, sort_order) VALUES
  ('solar',       'Photovoltaik / Solar', 1),
  ('waermepumpe', 'Wärmepumpe',           2),
  ('heizung',     'Heizung',              3),
  ('sanitaer',    'Sanitär',              4),
  ('elektro',     'Elektro',              5),
  ('general',     'Allgemein',            99)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- TENANTS (Kunden – Stammdaten + Billing)
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Stammdaten
  company_name            TEXT NOT NULL,
  contact_email           TEXT NOT NULL,
  phone                   TEXT,
  address                 TEXT,
  website                 TEXT,
  is_active               BOOLEAN DEFAULT TRUE,

  -- Billing
  billing_model           TEXT NOT NULL DEFAULT 'per_lead'
                            CHECK (billing_model IN ('per_lead', 'flat_monthly')),
  lead_price_base         NUMERIC(10,4) DEFAULT 3.00,
  flat_monthly_price      NUMERIC(10,4),
  flat_monthly_lead_limit INTEGER,

  -- Stripe (jetzt leer – Spalte ist vorbereitet)
  stripe_customer_id      TEXT
);

-- ============================================================
-- THEMES (Design-Konfiguration, wiederverwendbar)
-- ============================================================
CREATE TABLE IF NOT EXISTS themes (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- NULL = globale Vorlage; NOT NULL = tenant-eigenes Theme
  tenant_id             UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,

  primary_color         TEXT NOT NULL DEFAULT '#22c55e',
  text_color            TEXT DEFAULT '#1f2937',
  background_color      TEXT DEFAULT '#ffffff',
  page_background_color TEXT DEFAULT 'transparent',
  font                  TEXT DEFAULT 'system'
                          CHECK (font IN ('system', 'inter', 'poppins', 'roboto')),
  border_radius         TEXT DEFAULT '0.5rem',
  max_width             TEXT DEFAULT '720px'
);

-- Globale Vorlagen (tenant_id = NULL)
INSERT INTO themes (id, name, tenant_id, primary_color) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Standard Grün', NULL, '#22c55e'),
  ('00000000-0000-0000-0000-000000000002', 'Standard Blau', NULL, '#2563eb'),
  ('00000000-0000-0000-0000-000000000003', 'Standard Orange', NULL, '#f97316')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FUNNELS (Das Widget – Slug, Branche, Texte, Theme)
-- ============================================================
CREATE TABLE IF NOT EXISTS funnels (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  slug                  TEXT UNIQUE NOT NULL,
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  theme_id              UUID REFERENCES themes(id) ON DELETE SET NULL,
  industry              TEXT NOT NULL REFERENCES industries(id),
  is_active             BOOLEAN DEFAULT TRUE,

  -- Konfigurierbare Texte (NULL = generischer Default im Code)
  funnel_title          TEXT,   -- Default: "Jetzt kostenloses Angebot anfordern"
  submit_button_label   TEXT,   -- Default: "Anfrage absenden"
  success_message       TEXT,   -- Default: "Vielen Dank! Wir melden uns in Kürze bei Ihnen."
  response_time_text    TEXT,   -- Default: "24 Stunden"
  contact_form_subtitle TEXT,   -- Default: "Wer soll das Angebot erhalten?"
  privacy_text          TEXT,
  privacy_policy_url    TEXT DEFAULT '#'
);

-- ============================================================
-- FUNNEL QUESTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS funnel_questions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  funnel_id    UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  question_key TEXT NOT NULL,
  title        TEXT NOT NULL,
  visible      BOOLEAN DEFAULT TRUE,

  UNIQUE (funnel_id, question_key)
);

-- ============================================================
-- FUNNEL OPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS funnel_options (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  question_id UUID NOT NULL REFERENCES funnel_questions(id) ON DELETE CASCADE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  label       TEXT NOT NULL,
  value       TEXT NOT NULL,
  icon_key    TEXT,
  icon_url    TEXT,

  UNIQUE (question_id, value)
);

-- ============================================================
-- SUBMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS submissions (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at          TIMESTAMP WITH TIME ZONE,

  funnel_id           UUID REFERENCES funnels(id),
  funnel_slug         TEXT NOT NULL,   -- Snapshot: historisch korrekt wenn Slug mal geändert wird
  tenant_id           UUID REFERENCES tenants(id),

  -- Kontaktdaten
  contact_salutation  TEXT,
  contact_name        TEXT NOT NULL,
  contact_email       TEXT NOT NULL,
  contact_phone       TEXT,

  -- Antworten
  answers             JSONB NOT NULL,

  -- Billing-Snapshot (Preise zum Zeitpunkt der Submission – nicht rückwirkend änderbar)
  lead_price          NUMERIC(10,4) NOT NULL DEFAULT 0,
  billing_model       TEXT NOT NULL DEFAULT 'per_lead',

  -- UTM-Tracking (jetzt leer – Spalten sind vorbereitet)
  utm_source          TEXT,
  utm_medium          TEXT,
  utm_campaign        TEXT,

  -- Meta
  source_url          TEXT,
  user_agent          TEXT,
  honeypot_triggered  BOOLEAN DEFAULT FALSE,

  -- Status
  emails_sent         BOOLEAN DEFAULT FALSE,
  billed              BOOLEAN DEFAULT FALSE,
  billed_at           TIMESTAMP WITH TIME ZONE
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_funnels_slug
  ON funnels(slug) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_funnels_tenant
  ON funnels(tenant_id);

CREATE INDEX IF NOT EXISTS idx_funnel_questions_funnel
  ON funnel_questions(funnel_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_funnel_options_question
  ON funnel_options(question_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_submissions_funnel
  ON submissions(funnel_id, created_at);

CREATE INDEX IF NOT EXISTS idx_submissions_tenant
  ON submissions(tenant_id, created_at);

CREATE INDEX IF NOT EXISTS idx_submissions_billing
  ON submissions(tenant_id, billed, created_at) WHERE honeypot_triggered = FALSE;

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
  t.id                                                        AS tenant_id,
  t.company_name,
  t.billing_model,
  DATE_TRUNC('month', s.created_at)                           AS month,
  COUNT(*)                                                     AS submission_count,
  t.flat_monthly_lead_limit,
  GREATEST(0, COUNT(*) - COALESCE(t.flat_monthly_lead_limit, COUNT(*)))
                                                               AS overage_leads,
  CASE
    WHEN t.billing_model = 'flat_monthly'
      THEN COALESCE(t.flat_monthly_price, 0)
    ELSE SUM(s.lead_price)
  END                                                          AS amount_eur,
  SUM(CASE WHEN s.billed THEN 1 ELSE 0 END)                   AS already_billed
FROM submissions s
JOIN tenants t ON s.tenant_id = t.id
WHERE s.honeypot_triggered = FALSE
GROUP BY
  t.id, t.company_name, t.billing_model,
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
ALTER TABLE funnel_options   ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions      ENABLE ROW LEVEL SECURITY;

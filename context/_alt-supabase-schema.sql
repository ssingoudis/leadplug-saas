-- Funnel Widget Platform – Supabase Schema
-- Run this in the Supabase SQL editor.
-- Idempotent: safe to re-run on existing databases.

-- =============================================================================
-- TENANTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS tenants (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Identifikation
  slug                    TEXT UNIQUE NOT NULL,
  is_active               BOOLEAN DEFAULT TRUE,
  industry                TEXT NOT NULL DEFAULT 'general',
  -- Erlaubte Werte: 'solar' | 'waermepumpe' | 'heizung' | 'sanitaer' | 'elektro' | 'general'

  -- Unternehmensdaten
  company_name            TEXT NOT NULL,
  contact_email           TEXT NOT NULL,
  phone                   TEXT,
  address                 TEXT,
  website                 TEXT,
  logo_url                TEXT,

  -- Theme
  primary_color           TEXT NOT NULL DEFAULT '#22c55e',
  text_color              TEXT DEFAULT '#1f2937',
  background_color        TEXT DEFAULT '#ffffff',
  page_background_color   TEXT DEFAULT 'transparent',
  font                    TEXT DEFAULT 'system',   -- 'system' | 'inter' | 'poppins' | 'roboto'
  border_radius           TEXT DEFAULT '0.5rem',
  max_width               TEXT DEFAULT '720px',

  -- Konfigurierbare Funnel-Texte (NULL = generischer Default wird im Code verwendet)
  funnel_title            TEXT,   -- Default: "Jetzt kostenloses Angebot anfordern"
  submit_button_label     TEXT,   -- Default: "Anfrage absenden"
  success_message         TEXT,   -- Default: "Vielen Dank! Wir melden uns in Kürze bei Ihnen."
  response_time_text      TEXT,   -- Default: "24 Stunden"
  contact_form_subtitle   TEXT,   -- Default: "Wer soll das Angebot erhalten?"
  privacy_text            TEXT,   -- Default: generischer Text ohne Branchennennung
  privacy_policy_url      TEXT DEFAULT '#',

  -- Billing-Modell
  -- 'per_lead':     Tenant zahlt einen Betrag pro eingegangenem Lead (lead_price_base)
  -- 'flat_monthly': Tenant zahlt einen Pauschalbetrag pro Monat bis zu einem Lead-Limit
  billing_model           TEXT NOT NULL DEFAULT 'per_lead',

  -- Per-Lead Felder (aktiv wenn billing_model = 'per_lead')
  lead_price_base         NUMERIC(10,4) DEFAULT 3.00,

  -- Flat-Monthly Felder (aktiv wenn billing_model = 'flat_monthly')
  flat_monthly_price      NUMERIC(10,4),   -- z.B. 20.00 für bis zu 10 Leads/Monat
  flat_monthly_lead_limit INTEGER          -- z.B. 10; NULL = unlimitiert
  -- Leads über dem Limit werden zum lead_price_base abgerechnet (Overage-Logik, später)

  -- Vorbereitung für spätere SMS-Verifizierungs-Tier (noch nicht aktiv):
  -- lead_price_sms           NUMERIC(10,4) DEFAULT 5.00,
  -- sms_verification_enabled BOOLEAN DEFAULT FALSE
);

-- =============================================================================
-- FUNNEL QUESTIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS funnel_questions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  question_key TEXT NOT NULL,  -- Key im answers-JSONB, z.B. "gebaeudetyp"
  title        TEXT NOT NULL,
  visible      BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- FUNNEL OPTIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS funnel_options (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES funnel_questions(id) ON DELETE CASCADE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  label       TEXT NOT NULL,
  value       TEXT NOT NULL,   -- Wert der in answers gespeichert wird
  icon_key    TEXT,            -- Built-in SVG-Icon in funnel.tsx, z.B. "House", "Thermometer"
  icon_url    TEXT,            -- Externes Bild; hat Vorrang über icon_key wenn gesetzt
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- SUBMISSIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS submissions (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at          TIMESTAMP WITH TIME ZONE,

  -- Tenant (tenant_slug denormalisiert für einfachere Abfragen ohne JOIN)
  tenant_id           UUID REFERENCES tenants(id),
  tenant_slug         TEXT NOT NULL,

  -- Kontaktdaten
  contact_salutation  TEXT,
  contact_name        TEXT NOT NULL,
  contact_email       TEXT NOT NULL,
  contact_phone       TEXT,

  -- Funnel-Antworten
  answers             JSONB NOT NULL,

  -- Billing
  -- lead_price: Preis zum Zeitpunkt der Submission (historisch korrekt).
  -- Bei billing_model = 'per_lead': = tenants.lead_price_base
  -- Bei billing_model = 'flat_monthly': = 0 (Abrechnung erfolgt pauschal pro Monat)
  lead_price          NUMERIC(10,4) NOT NULL DEFAULT 0,
  billing_model       TEXT NOT NULL DEFAULT 'per_lead',  -- Snapshot des Modells zum Zeitpunkt

  -- Vorbereitung für SMS-Verifizierung (noch nicht aktiv):
  -- lead_tier        TEXT DEFAULT 'email',     -- 'email' | 'sms_verified'
  -- phone_verified   BOOLEAN DEFAULT FALSE,

  -- Meta
  source_url          TEXT,
  user_agent          TEXT,
  honeypot_triggered  BOOLEAN DEFAULT FALSE,  -- TRUE = Bot; zählt NICHT in monthly_billing

  -- Status
  emails_sent         BOOLEAN DEFAULT FALSE,
  billed              BOOLEAN DEFAULT FALSE
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_tenants_slug
  ON tenants(slug) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_funnel_questions_tenant
  ON funnel_questions(tenant_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_funnel_options_question
  ON funnel_options(question_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_submissions_tenant
  ON submissions(tenant_slug);

CREATE INDEX IF NOT EXISTS idx_submissions_billing
  ON submissions(tenant_id, billed, created_at) WHERE honeypot_triggered = FALSE;

-- =============================================================================
-- MONTHLY BILLING VIEW
--
-- Zählt nur legitime Submissions (honeypot_triggered = FALSE).
--
-- billing_model = 'per_lead':
--   amount_eur = SUM(lead_price) aller Submissions des Monats
--
-- billing_model = 'flat_monthly':
--   amount_eur = flat_monthly_price (Pauschale, unabhängig von Lead-Anzahl)
--   Leads über flat_monthly_lead_limit: werden als overages angezeigt (noch nicht automatisch berechnet)
-- =============================================================================

CREATE OR REPLACE VIEW monthly_billing AS
SELECT
  t.slug                                                    AS tenant_slug,
  t.company_name,
  t.billing_model,
  DATE_TRUNC('month', s.created_at)                        AS month,
  COUNT(*)                                                  AS submission_count,
  t.flat_monthly_lead_limit,
  GREATEST(0, COUNT(*) - COALESCE(t.flat_monthly_lead_limit, COUNT(*)))
                                                            AS overage_leads,
  CASE
    WHEN t.billing_model = 'flat_monthly' THEN t.flat_monthly_price
    ELSE SUM(s.lead_price)
  END                                                       AS amount_eur,
  SUM(CASE WHEN s.billed THEN 1 ELSE 0 END)                AS already_billed
FROM submissions s
JOIN tenants t ON s.tenant_id = t.id
WHERE s.honeypot_triggered = FALSE
GROUP BY
  t.slug, t.company_name, t.billing_model,
  t.flat_monthly_price, t.flat_monthly_lead_limit,
  DATE_TRUNC('month', s.created_at)
ORDER BY month DESC, t.slug;

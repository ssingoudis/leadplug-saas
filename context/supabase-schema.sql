-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.funnel_questions (
  question_key text NOT NULL,
  title text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  visible boolean DEFAULT true,
  funnel_slug text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question_type USER-DEFINED NOT NULL DEFAULT 'single_choice'::question_type,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT funnel_questions_pkey PRIMARY KEY (id),
  CONSTRAINT funnel_questions_funnel_slug_fkey FOREIGN KEY (funnel_slug) REFERENCES public.funnels(slug)
);
CREATE TABLE public.funnels (
  slug text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  industry text NOT NULL,
  tenant_slug text NOT NULL,
  funnel_title text,
  submit_button_label text,
  success_message text,
  response_time_text text,
  contact_form_subtitle text,
  privacy_policy_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email_sender_local text,
  primary_color text,
  text_color text,
  background_color text,
  page_background_color text,
  font text,
  border_radius text,
  max_width text,
  CONSTRAINT funnels_pkey PRIMARY KEY (id),
  CONSTRAINT funnels_tenant_slug_fkey FOREIGN KEY (tenant_slug) REFERENCES public.tenants(slug)
);
CREATE TABLE public.honeypot_triggers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  ip_address text,
  funnel_slug text,
  CONSTRAINT honeypot_triggers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.submissions (
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text NOT NULL,
  answers jsonb NOT NULL,
  funnel_slug text NOT NULL,
  tenant_slug text NOT NULL,
  lead_price numeric DEFAULT 0,
  source_url text,
  user_agent text,
  honeypot_triggered boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ip_address text,
  contact_anrede text,
  customer_email_sent boolean DEFAULT false,
  tenant_email_sent boolean DEFAULT false,
  CONSTRAINT submissions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tenants (
  slug text NOT NULL UNIQUE,
  company_name text NOT NULL,
  is_active boolean DEFAULT true,
  public_email text NOT NULL,
  public_phone text,
  notification_email text NOT NULL,
  address text,
  website text,
  billing_model text NOT NULL DEFAULT 'per_lead'::text CHECK (billing_model = ANY (ARRAY['per_lead'::text, 'flat_monthly'::text])),
  lead_price_base numeric DEFAULT 3.00,
  flat_monthly_price numeric,
  flat_monthly_lead_limit integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT tenants_pkey PRIMARY KEY (id)
);
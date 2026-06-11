-- =============================================================================
-- Aufgabe 62 — Vorlagen-Galerie + Funnel-Duplizieren (UP)
--
-- 1. Tabelle `funnel_templates`: kuratierte Funnel-Vorlagen als jsonb-Snapshot.
--    Bewusste Entkopplung von den Demo-Funnels (Stavros-Entscheid): Demo-Edits
--    ändern Templates NICHT — veröffentlicht wird explizit per Snapshot-RPC.
--    RLS: SELECT für authenticated (Galerie), KEINE Write-Policies (Pflege nur
--    via Admin/Service-Key/Owner — User können keine globalen Templates anlegen).
--
-- 2. RPC `snapshot_funnel_to_template`: veröffentlicht einen Live-Funnel als
--    Vorlage (Upsert auf template-slug). Definition-Format:
--      { funnel: {theme+texte}, pages: [{page_type, sort_order, config,
--        fields: [...]}], logic_rules: [{source_page_index, target_page_index,
--        ...}], emails: [...] }
--    Seiten-Referenzen über Array-Indizes (Reihenfolge = sort_order) — bei der
--    Instanziierung werden daraus frische UUIDs. EXECUTE nur für Admin-Kontexte
--    (revoked für authenticated/anon) — wird heute via Service/Owner aufgerufen,
--    später vom Admin-Button.
--
-- 3. RPC `create_funnel_from_template`: instanziiert eine Vorlage als neuen
--    Funnel des aufrufenden Tenants. SECURITY INVOKER — alle Inserts laufen
--    unter den RLS-Policies des Users (Tenant-Isolation bleibt; fremde
--    tenant_id scheitert an den INSERT-Policies). Atomar (plpgsql = eine
--    Transaktion): kein halb-angelegter Funnel bei Fehlern.
--    Kopiert: Funnel-Texte+Theme, Pages, Fields, Logik-Regeln, Drip-Mails.
--    NICHT kopiert: Webhooks (kundenspezifische URLs), Tracking-IDs.
--
-- 4. RPC `duplicate_funnel`: kopiert einen eigenen Funnel innerhalb des Tenants
--    („Kopie von X", neuer Slug). SECURITY INVOKER: die SELECT-Policy macht
--    fremde Funnels unsichtbar → cross-tenant Duplizieren ist unmöglich.
--    Kopiert wie oben + notification_email/sender/redirect des Originals.
--    NICHT kopiert: Webhooks, Tracking-IDs (meta_pixel_id/google_ads_conversion
--    sind endkunden-spezifisch — falsche Pixel auf der Kopie wären schädlich).
--
-- Rollback: 20260611200000_aufgabe_62_funnel_templates_DOWN.sql
-- =============================================================================

-- 1. Tabelle ---------------------------------------------------------------

create table public.funnel_templates (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique
                        check (slug ~ '^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$'),
  name                text not null check (length(trim(name)) > 0),
  description         text not null default '',
  category            text not null default '',
  preview_funnel_slug text,
  definition          jsonb not null,
  sort_order          int not null default 0,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_funnel_templates_active
  on public.funnel_templates (sort_order)
  where is_active;

create trigger trg_funnel_templates_updated_at
  before update on public.funnel_templates
  for each row execute function public.update_updated_at();

alter table public.funnel_templates enable row level security;

-- Galerie: jeder eingeloggte User sieht aktive Vorlagen. Keine Write-Policies.
create policy funnel_templates_select on public.funnel_templates
  for select to authenticated
  using (is_active);

-- 2. Snapshot-RPC (Veröffentlichen) ----------------------------------------

create or replace function public.snapshot_funnel_to_template(
  p_funnel_slug   text,
  p_template_slug text,
  p_name          text,
  p_description   text default '',
  p_category      text default '',
  p_sort_order    int  default 0
) returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_funnel     funnels%rowtype;
  v_definition jsonb;
  v_id         uuid;
begin
  select * into v_funnel from funnels where slug = p_funnel_slug;
  if not found then
    raise exception 'Funnel % nicht gefunden', p_funnel_slug;
  end if;

  v_definition := jsonb_build_object(
    'funnel', jsonb_build_object(
      'contact_form_title',     v_funnel.contact_form_title,
      'success_message',        v_funnel.success_message,
      'response_message',       v_funnel.response_message,
      'contact_form_subtitle',  v_funnel.contact_form_subtitle,
      'privacy_policy_url',     v_funnel.privacy_policy_url,
      'privacy_text',           v_funnel.privacy_text,
      'answers_overview_label', v_funnel.answers_overview_label,
      'show_answers_overview',  v_funnel.show_answers_overview,
      'show_progress_bar',      v_funnel.show_progress_bar,
      'show_step_badge',        v_funnel.show_step_badge,
      'title_alignment',        v_funnel.title_alignment,
      'primary_color',          v_funnel.primary_color,
      'text_color',             v_funnel.text_color,
      'background_color',       v_funnel.background_color,
      'page_background_color',  v_funnel.page_background_color,
      'font',                   v_funnel.font,
      'border_radius',          v_funnel.border_radius,
      'max_width',              v_funnel.max_width
    ),
    'pages', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'page_type',  p.page_type,
        'sort_order', p.sort_order,
        'config',     coalesce(p.config, '{}'::jsonb),
        'fields', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'field_key',   f.field_key,
            'field_type',  f.field_type,
            'label',       f.label,
            'subtitle',    f.subtitle,
            'placeholder', f.placeholder,
            'visible',     f.visible,
            'required',    f.required,
            'sort_order',  f.sort_order,
            'options',     coalesce(f.options, '[]'::jsonb),
            'config',      coalesce(f.config, '{}'::jsonb)
          ) order by f.sort_order), '[]'::jsonb)
          from fields f where f.page_id = p.id
        )
      ) order by p.sort_order), '[]'::jsonb)
      from pages p where p.funnel_id = v_funnel.id
    ),
    'logic_rules', (
      with pidx as (
        select id, (row_number() over (order by sort_order, id))::int - 1 as idx
        from pages where funnel_id = v_funnel.id
      )
      select coalesce(jsonb_agg(jsonb_build_object(
        'source_page_index', s.idx,
        'sort_order',        r.sort_order,
        'is_fallback',       r.is_fallback,
        'conditions',        r.conditions,
        'target_type',       r.target_type,
        'target_page_index', t.idx
      ) order by s.idx, r.sort_order), '[]'::jsonb)
      from funnel_logic_rules r
      join pidx s on s.id = r.source_page_id
      left join pidx t on t.id = r.target_page_id
      where r.funnel_id = v_funnel.id
    ),
    'emails', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name',           e.name,
        'recipient_type', e.recipient_type,
        'recipient_value', e.recipient_value,
        'delay_minutes',  e.delay_minutes,
        'subject',        e.subject,
        'body_html',      e.body_html,
        'is_active',      e.is_active
      ) order by e.created_at), '[]'::jsonb)
      from email_subscriptions e where e.funnel_id = v_funnel.id
    )
  );

  insert into funnel_templates (slug, name, description, category, preview_funnel_slug, definition, sort_order)
  values (p_template_slug, p_name, coalesce(p_description, ''), coalesce(p_category, ''), p_funnel_slug, v_definition, p_sort_order)
  on conflict (slug) do update set
    name                = excluded.name,
    description         = excluded.description,
    category            = excluded.category,
    preview_funnel_slug = excluded.preview_funnel_slug,
    definition          = excluded.definition,
    sort_order          = excluded.sort_order
  returning id into v_id;

  return v_id;
end;
$$;

-- Veröffentlichen ist Plattform-Owner-Sache — kein Aufruf durch normale User.
revoke execute on function public.snapshot_funnel_to_template(text, text, text, text, text, int) from public, anon, authenticated;

-- 3. Instanziierungs-RPC (Vorlage → neuer Funnel) ---------------------------

create or replace function public.create_funnel_from_template(
  p_template_slug      text,
  p_tenant_id          uuid,
  p_notification_email text
) returns text
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_tpl       funnel_templates%rowtype;
  v_slug      text;
  v_funnel_id uuid;
  v_page_ids  uuid[] := '{}';
  v_page      jsonb;
  v_field     jsonb;
  v_rule      jsonb;
  v_email     jsonb;
  v_pid       uuid;
  v_src       int;
  v_tgt       int;
begin
  select * into v_tpl from funnel_templates where slug = p_template_slug and is_active;
  if not found then
    raise exception 'Vorlage % nicht gefunden', p_template_slug;
  end if;
  if p_notification_email is null or trim(p_notification_email) = '' then
    raise exception 'Benachrichtigungs-E-Mail fehlt';
  end if;

  -- Eindeutigen 8-Zeichen-Slug erzeugen (Muster generateRandomSlug).
  loop
    v_slug := substr(md5(random()::text), 1, 8);
    exit when not exists (select 1 from funnels where slug = v_slug);
  end loop;

  -- Funnel-Row: Texte + Theme aus der Vorlage, Identität vom Aufrufer.
  -- RLS-INSERT-Policy erzwingt, dass p_tenant_id zum aufrufenden User gehört.
  insert into funnels (
    slug, tenant_id, funnel_name, notification_email, is_active,
    contact_form_title, success_message, response_message, contact_form_subtitle,
    privacy_policy_url, privacy_text, answers_overview_label,
    show_answers_overview, show_progress_bar, show_step_badge, title_alignment,
    primary_color, text_color, background_color, page_background_color,
    font, border_radius, max_width
  ) values (
    v_slug, p_tenant_id, v_tpl.name, trim(p_notification_email), true,
    v_tpl.definition->'funnel'->>'contact_form_title',
    v_tpl.definition->'funnel'->>'success_message',
    v_tpl.definition->'funnel'->>'response_message',
    v_tpl.definition->'funnel'->>'contact_form_subtitle',
    v_tpl.definition->'funnel'->>'privacy_policy_url',
    v_tpl.definition->'funnel'->>'privacy_text',
    v_tpl.definition->'funnel'->>'answers_overview_label',
    coalesce((v_tpl.definition->'funnel'->>'show_answers_overview')::boolean, false),
    coalesce((v_tpl.definition->'funnel'->>'show_progress_bar')::boolean, true),
    coalesce((v_tpl.definition->'funnel'->>'show_step_badge')::boolean, true),
    coalesce(v_tpl.definition->'funnel'->>'title_alignment', 'left'),
    v_tpl.definition->'funnel'->>'primary_color',
    v_tpl.definition->'funnel'->>'text_color',
    v_tpl.definition->'funnel'->>'background_color',
    v_tpl.definition->'funnel'->>'page_background_color',
    v_tpl.definition->'funnel'->>'font',
    v_tpl.definition->'funnel'->>'border_radius',
    v_tpl.definition->'funnel'->>'max_width'
  ) returning id into v_funnel_id;

  -- Pages + Fields (Array-Index → frische UUID).
  for v_page in select * from jsonb_array_elements(v_tpl.definition->'pages') loop
    v_pid := gen_random_uuid();
    v_page_ids := v_page_ids || v_pid;

    insert into pages (id, funnel_id, page_type, sort_order, config)
    values (
      v_pid, v_funnel_id,
      (v_page->>'page_type')::page_type,
      coalesce((v_page->>'sort_order')::int, array_length(v_page_ids, 1) - 1),
      coalesce(v_page->'config', '{}'::jsonb)
    );

    for v_field in select * from jsonb_array_elements(coalesce(v_page->'fields', '[]'::jsonb)) loop
      insert into fields (page_id, field_key, field_type, label, subtitle,
                          placeholder, visible, required, sort_order, options, config)
      values (
        v_pid,
        v_field->>'field_key',
        (v_field->>'field_type')::field_type,
        coalesce(v_field->>'label', ''),
        v_field->>'subtitle',
        v_field->>'placeholder',
        coalesce((v_field->>'visible')::boolean, true),
        coalesce((v_field->>'required')::boolean, false),
        coalesce((v_field->>'sort_order')::int, 0),
        coalesce(v_field->'options', '[]'::jsonb),
        coalesce(v_field->'config', '{}'::jsonb)
      );
    end loop;
  end loop;

  -- Logik-Regeln (Index-Referenzen → neue Page-UUIDs). Regeln mit verwaistem
  -- page-Ziel (target_page_index null) werden übersprungen — die Runtime würde
  -- sie ohnehin degradieren.
  for v_rule in select * from jsonb_array_elements(coalesce(v_tpl.definition->'logic_rules', '[]'::jsonb)) loop
    v_src := (v_rule->>'source_page_index')::int;
    v_tgt := (v_rule->>'target_page_index')::int;
    if v_src is null or v_src < 0 or v_src >= coalesce(array_length(v_page_ids, 1), 0) then
      continue;
    end if;
    if v_rule->>'target_type' = 'page'
       and (v_tgt is null or v_tgt < 0 or v_tgt >= coalesce(array_length(v_page_ids, 1), 0)) then
      continue;
    end if;

    insert into funnel_logic_rules (funnel_id, tenant_id, source_page_id, sort_order,
                                    is_fallback, conditions, target_type, target_page_id)
    values (
      v_funnel_id, p_tenant_id,
      v_page_ids[v_src + 1],
      coalesce((v_rule->>'sort_order')::int, 0),
      coalesce((v_rule->>'is_fallback')::boolean, false),
      coalesce(v_rule->'conditions', '[]'::jsonb),
      v_rule->>'target_type',
      case when v_rule->>'target_type' = 'page' then v_page_ids[v_tgt + 1] else null end
    );
  end loop;

  -- Drip-Mails (Teil des Template-Werts; Empfänger-Logik 'tenant' zieht
  -- automatisch die notification_email des neuen Funnels).
  for v_email in select * from jsonb_array_elements(coalesce(v_tpl.definition->'emails', '[]'::jsonb)) loop
    insert into email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                     recipient_value, delay_minutes, subject, body_html, is_active)
    values (
      v_funnel_id, p_tenant_id,
      v_email->>'name',
      v_email->>'recipient_type',
      v_email->>'recipient_value',
      coalesce((v_email->>'delay_minutes')::int, 0),
      v_email->>'subject',
      v_email->>'body_html',
      coalesce((v_email->>'is_active')::boolean, true)
    );
  end loop;

  return v_slug;
end;
$$;

revoke execute on function public.create_funnel_from_template(text, uuid, text) from public, anon;
grant execute on function public.create_funnel_from_template(text, uuid, text) to authenticated;

-- 4. Duplizieren-RPC (eigener Funnel → Kopie im selben Tenant) ---------------

create or replace function public.duplicate_funnel(
  p_source_slug text
) returns text
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_src       funnels%rowtype;
  v_slug      text;
  v_funnel_id uuid;
  v_page      record;
  v_pid       uuid;
  v_page_map  jsonb := '{}'::jsonb;
begin
  -- SECURITY INVOKER: RLS-SELECT-Policy blendet fremde Funnels aus →
  -- cross-tenant Duplizieren ist per Konstruktion unmöglich.
  select * into v_src from funnels where slug = p_source_slug;
  if not found then
    raise exception 'Funnel nicht gefunden oder kein Zugriff';
  end if;

  loop
    v_slug := substr(md5(random()::text), 1, 8);
    exit when not exists (select 1 from funnels where slug = v_slug);
  end loop;

  -- Tracking-IDs (meta_pixel_id/google_ads_conversion) bewusst NICHT kopieren —
  -- endkunden-spezifisch; falsche Pixel auf der Kopie wären schädlich.
  insert into funnels (
    slug, tenant_id, funnel_name, notification_email, is_active,
    contact_form_title, success_message, response_message, contact_form_subtitle,
    privacy_policy_url, privacy_text, answers_overview_label,
    show_answers_overview, show_progress_bar, show_step_badge, title_alignment,
    hide_contact_warning, email_sender_local, redirect_url,
    primary_color, text_color, background_color, page_background_color,
    font, border_radius, max_width
  ) values (
    v_slug, v_src.tenant_id,
    'Kopie von ' || coalesce(nullif(v_src.funnel_name, ''), v_src.slug),
    v_src.notification_email, true,
    v_src.contact_form_title, v_src.success_message, v_src.response_message,
    v_src.contact_form_subtitle, v_src.privacy_policy_url, v_src.privacy_text,
    v_src.answers_overview_label, v_src.show_answers_overview,
    v_src.show_progress_bar, v_src.show_step_badge, v_src.title_alignment,
    v_src.hide_contact_warning, v_src.email_sender_local, v_src.redirect_url,
    v_src.primary_color, v_src.text_color, v_src.background_color,
    v_src.page_background_color, v_src.font, v_src.border_radius, v_src.max_width
  ) returning id into v_funnel_id;

  -- Pages kopieren + Mapping alt→neu für Fields und Logik-Regeln.
  for v_page in select id from pages where funnel_id = v_src.id order by sort_order, id loop
    v_pid := gen_random_uuid();
    v_page_map := v_page_map || jsonb_build_object(v_page.id::text, v_pid::text);

    insert into pages (id, funnel_id, page_type, sort_order, config)
    select v_pid, v_funnel_id, page_type, sort_order, config
    from pages where id = v_page.id;

    insert into fields (page_id, field_key, field_type, label, subtitle,
                        placeholder, visible, required, sort_order, options, config)
    select v_pid, field_key, field_type, label, subtitle,
           placeholder, visible, required, sort_order, options, config
    from fields where page_id = v_page.id;
  end loop;

  insert into funnel_logic_rules (funnel_id, tenant_id, source_page_id, sort_order,
                                  is_fallback, conditions, target_type, target_page_id)
  select
    v_funnel_id, v_src.tenant_id,
    (v_page_map->>(r.source_page_id::text))::uuid,
    r.sort_order, r.is_fallback, r.conditions, r.target_type,
    case when r.target_page_id is not null
         then (v_page_map->>(r.target_page_id::text))::uuid
         else null end
  from funnel_logic_rules r
  where r.funnel_id = v_src.id
    and v_page_map ? r.source_page_id::text;

  insert into email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                   recipient_value, delay_minutes, subject, body_html, is_active)
  select v_funnel_id, v_src.tenant_id, name, recipient_type,
         recipient_value, delay_minutes, subject, body_html, is_active
  from email_subscriptions where funnel_id = v_src.id;

  return v_slug;
end;
$$;

revoke execute on function public.duplicate_funnel(text) from public, anon;
grant execute on function public.duplicate_funnel(text) to authenticated;

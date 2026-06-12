-- =============================================================================
-- Aufgabe 63 — Snapshot-Härtung: Drip-Mails in Vorlagen IMMER aktiv (UP)
--
-- Hintergrund (Republish-Falle, dokumentiert in context/vorlagen-kochbuch.md):
-- Die Demo-Funnels haben deaktivierte email_subscriptions (Vorschau-Spieler
-- sollen keine Mails von fiktiven Firmen bekommen). snapshot_funnel_to_template
-- kopierte bisher `e.is_active` mit in die Definition — ein Republish NACH der
-- Deaktivierung lieferte die Vorlage mit inaktiven Mails aus, Kunden bekämen
-- keine Drip-Mails.
--
-- Fix: Die emails-Sektion der Definition schreibt `is_active` jetzt IMMER als
-- true. Damit entfällt das manuelle „Mails an → snapshotten → Mails aus" vor
-- jedem Republish. Einzige Änderung gegenüber Aufgabe 62: `'is_active', true`
-- statt `'is_active', e.is_active`.
--
-- Rollback: 20260611230000_aufgabe_63_snapshot_mails_active_DOWN.sql
-- (stellt die Aufgabe-62-Fassung mit e.is_active wieder her)
-- =============================================================================

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
      -- Aufgabe 63: Vorlagen liefern Drip-Mails IMMER aktiv aus — der
      -- is_active-Status des Quell-Funnels ist Demo-Betriebszustand
      -- (Vorschau ohne Mails), kein Template-Inhalt.
      select coalesce(jsonb_agg(jsonb_build_object(
        'name',           e.name,
        'recipient_type', e.recipient_type,
        'recipient_value', e.recipient_value,
        'delay_minutes',  e.delay_minutes,
        'subject',        e.subject,
        'body_html',      e.body_html,
        'is_active',      true
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

-- Grants unverändert: Veröffentlichen bleibt Plattform-Owner-Sache.
revoke execute on function public.snapshot_funnel_to_template(text, text, text, text, text, int) from public, anon, authenticated;

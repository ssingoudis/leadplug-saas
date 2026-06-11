-- =============================================================================
-- Aufgabe 62 Runde 3 — Namens-Abfrage beim „Vorlage verwenden" (DOWN)
--
-- Reihenfolge: erst den Code zurückrollen (Route ruft die 4-Param-Fassung),
-- dann dieses File anwenden. Stellt die 3-Param-Fassung aus
-- 20260611200000_aufgabe_62_funnel_templates.sql wieder her.
-- =============================================================================

drop function if exists public.create_funnel_from_template(text, uuid, text, text);

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

  loop
    v_slug := substr(md5(random()::text), 1, 8);
    exit when not exists (select 1 from funnels where slug = v_slug);
  end loop;

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

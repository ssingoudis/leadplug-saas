-- =============================================================================
-- Aufgabe 77 — duplicate_funnel kopiert icon_color mit (UP)
--
-- duplicate_funnel (Aufgabe 62) kopiert funnels-Spalten über eine explizite
-- Spalten-Liste. icon_color ist die erste neue funnels-Theme-Spalte seit der
-- Funktions-Erstellung — ohne dieses Update verlöre eine Funnel-Kopie still
-- den Brand-Tint der Bibliotheks-Icons (die icon_key-Werte im options-jsonb
-- überleben, der Farbmodus fiele auf 'neutral' zurück).
--
-- Einzige Änderung gegenüber der Aufgabe-62-Fassung: icon_color in der
-- Spalten-Liste + v_src.icon_color in den VALUES. Rest identisch.
--
-- Hinweis: snapshot_funnel_to_template + create_funnel_from_template tragen
-- icon_color ebenfalls noch nicht — bewusst aufgeschoben bis Vorlagen Icons
-- bekommen (siehe context/current-feature.md, Aufgabe 77 „Offen").
--
-- Rollback: 20260702130000_aufgabe_77_duplicate_funnel_icon_color_DOWN.sql
-- =============================================================================

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
    font, border_radius, max_width, icon_color
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
    v_src.page_background_color, v_src.font, v_src.border_radius, v_src.max_width,
    v_src.icon_color
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

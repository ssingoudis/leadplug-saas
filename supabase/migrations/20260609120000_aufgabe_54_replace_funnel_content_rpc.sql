-- =============================================================================
-- Aufgabe 54 — Pre-Launch-Fixes (UP)
--
-- 1. RPC `replace_funnel_content`: atomares Speichern des Funnel-Inhalts.
--    Ersetzt das nicht-transaktionale Delete-then-Insert in PUT
--    /api/tenant/funnels/[slug]. Eine plpgsql-Funktion läuft implizit in einer
--    Transaktion: schlägt irgendein Statement fehl, bleibt der alte Stand
--    vollständig erhalten (kein Datenverlust-Fenster, kein leerer Funnel für
--    Widget-Loads während des Saves).
--
--    Pages werden UPSERTED statt gelöscht+neu angelegt: bestehende Page-UUIDs
--    bleiben über Saves stabil (Voraussetzung: editorStateToPagesAndFields
--    reicht die dbId wieder mit — Code-Teil von Aufgabe 54). Damit überleben
--    webhook_subscriptions.trigger_page_id-Bindings (FK ON DELETE SET NULL)
--    das Speichern — vorher wurden after_page-Webhooks bei jedem Save genullt.
--
--    SECURITY INVOKER (Default): alle Statements laufen unter den RLS-Policies
--    des aufrufenden Users — Tenant-Isolation bleibt vollständig erhalten.
--
-- 2. Partial-Index für den Rate-Limiter in /api/submit: zählt nur noch
--    completed Submissions pro IP (Code-Teil von Aufgabe 54); der Index
--    macht die Query indexgestützt statt Seq-Scan.
--
-- Rollback: 20260609120000_aufgabe_54_replace_funnel_content_rpc_DOWN.sql
-- =============================================================================

create or replace function public.replace_funnel_content(
  p_funnel_id uuid,
  p_pages     jsonb,
  p_fields    jsonb
) returns void
language plpgsql
set search_path = public
as $$
begin
  -- RLS-Backstop: Funnel muss für den Aufrufer sichtbar sein (fremde Tenants
  -- sehen durch die SELECT-Policy nichts → Exception statt stillem No-Op).
  if not exists (select 1 from funnels where id = p_funnel_id) then
    raise exception 'Funnel nicht gefunden oder kein Zugriff';
  end if;

  -- 1. Pages löschen, die im neuen Stand nicht mehr vorkommen.
  --    fields.page_id CASCADE räumt deren Fields mit; trigger_page_id wird nur
  --    für tatsächlich entfernte Pages genullt.
  delete from pages
  where funnel_id = p_funnel_id
    and id <> all (array(
      select (e->>'id')::uuid
      from jsonb_array_elements(p_pages) e
      where e->>'id' is not null
    ));

  -- 2. Pages upserten — bestehende UUIDs bleiben erhalten.
  --    funnel_id wird hart auf p_funnel_id gesetzt (Payload-funnel_id wird
  --    ignoriert); fremde Page-IDs scheitern an der RLS-UPDATE-Policy → Rollback.
  insert into pages (id, funnel_id, page_type, sort_order, config)
  select
    (e->>'id')::uuid,
    p_funnel_id,
    (e->>'page_type')::page_type,
    (e->>'sort_order')::int,
    coalesce(e->'config', '{}'::jsonb)
  from jsonb_array_elements(p_pages) e
  on conflict (id) do update set
    page_type  = excluded.page_type,
    sort_order = excluded.sort_order,
    config     = excluded.config;

  -- 3. Fields der verbleibenden Pages komplett ersetzen (keine Inbound-FKs auf
  --    fields → Delete+Insert ist hier unkritisch und umgeht den
  --    UNIQUE(page_id, field_key)-Constraint bei Key-Umbenennungen).
  delete from fields
  where page_id in (select id from pages where funnel_id = p_funnel_id);

  insert into fields (page_id, field_key, field_type, label, subtitle,
                      placeholder, visible, required, sort_order, options, config)
  select
    (e->>'page_id')::uuid,
    e->>'field_key',
    (e->>'field_type')::field_type,
    coalesce(e->>'label', ''),
    e->>'subtitle',
    e->>'placeholder',
    coalesce((e->>'visible')::boolean, true),
    coalesce((e->>'required')::boolean, false),
    coalesce((e->>'sort_order')::int, 0),
    coalesce(e->'options', '[]'::jsonb),
    coalesce(e->'config', '{}'::jsonb)
  from jsonb_array_elements(p_fields) e;
end;
$$;

-- Nur eingeloggte User dürfen die Funktion aufrufen (RLS macht die eigentliche
-- Tenant-Isolation; anon hat im Editor-Kontext nichts verloren).
revoke execute on function public.replace_funnel_content(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.replace_funnel_content(uuid, jsonb, jsonb) to authenticated;

-- =============================================================================
-- 2. Rate-Limiter-Index: /api/submit zählt completed Submissions pro IP.
-- =============================================================================
create index if not exists idx_submissions_ip_completed
  on public.submissions (ip_address, created_at)
  where completed_at is not null;

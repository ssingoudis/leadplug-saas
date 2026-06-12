-- =============================================================================
-- Charge 2 — Schritt 4: Verifikation (nach charge2_01–06, vor dem Publish).
-- =============================================================================

-- 1) Struktur-Counts (erwartet: siehe Kommentar pro Zeile)
SELECT f.slug,
  (SELECT count(*) FROM pages p WHERE p.funnel_id = f.id)  AS pages,
  (SELECT count(*) FROM fields fl JOIN pages p ON p.id = fl.page_id WHERE p.funnel_id = f.id) AS fields,
  (SELECT count(*) FROM funnel_logic_rules r WHERE r.funnel_id = f.id) AS rules,
  (SELECT count(*) FROM email_subscriptions e WHERE e.funnel_id = f.id) AS emails
FROM funnels f
WHERE f.slug IN ('demo-badsanierung', 'demo-treppenlift', 'demo-umzug',
                 'demo-pflege-recruiting', 'demo-bu', 'demo-zahnimplantate')
ORDER BY f.created_at;
-- Erwartung:
--   demo-badsanierung       pages=8  fields=9   rules=2  emails=2
--   demo-treppenlift        pages=8  fields=9   rules=1  emails=2
--   demo-umzug              pages=9  fields=11  rules=1  emails=2
--   demo-pflege-recruiting  pages=9  fields=9   rules=1  emails=2
--   demo-bu                 pages=8  fields=8   rules=2  emails=2
--   demo-zahnimplantate     pages=8  fields=8   rules=1  emails=2

-- 2) Alle Logik-Sprünge vorwärts? (forward muss überall true sein)
SELECT f.slug, src.sort_order AS s, tgt.sort_order AS t,
       (src.sort_order < tgt.sort_order) AS forward
FROM funnel_logic_rules r
JOIN funnels f ON f.id = r.funnel_id
JOIN pages src ON src.id = r.source_page_id
LEFT JOIN pages tgt ON tgt.id = r.target_page_id
WHERE f.slug IN ('demo-badsanierung', 'demo-treppenlift', 'demo-umzug',
                 'demo-pflege-recruiting', 'demo-bu', 'demo-zahnimplantate');

-- 3) Danach pro Funnel ein WebFetch auf https://app.leadplug.de/<slug>
--    (SSR lädt = getTenantConfig ok):
--    demo-badsanierung · demo-treppenlift · demo-umzug ·
--    demo-pflege-recruiting · demo-bu · demo-zahnimplantate

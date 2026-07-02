// Einmal-Skript: provisioniert ein sauberes Demo-Konto fuer das Vermarktungs-Video.
// Legt an: bestaetigter Auth-User -> Tenant -> Owner-Membership -> Funnel (Struktur von
// SOURCE_SLUG geklont) -> realistische Leads (gemischte Status) + Aufrufe.
// Re-runnable: raeumt eigenen Bestand (Funnel/Leads/Views dieses Tenants) vorher auf.
//
// Start:  node scripts/seed-demo-account.mjs
//
// Liest SUPABASE_URL + SUPABASE_SERVICE_KEY aus .env.local (Service-Key = RLS-Bypass).

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// ---------- Konfiguration ----------
const EMAIL = 'produktdemo@leadplug.de'
const PASSWORD = '12345678'
const COMPANY_NAME = 'Nordpixel Media'
const FUNNEL_NAME = 'Immobilienbewertung Demo'
const NEW_SLUG = 'immobilien-demo'
const SOURCE_SLUG = 'ed48feca'
const N_COMPLETED = 30
const N_ABANDONED = 8
const N_VIEWS = 140

// ---------- .env.local laden ----------
function loadEnv() {
  const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  const env = {}
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    let v = m[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    env[m[1]] = v
  }
  return env
}

const env = loadEnv()
const SB_URL = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE = env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY
if (!SB_URL || !SERVICE) {
  console.error('FEHLER: SUPABASE_URL / SUPABASE_SERVICE_KEY nicht in .env.local gefunden.')
  process.exit(1)
}

const sb = createClient(SB_URL, SERVICE, { auth: { persistSession: false } })

// ---------- Helfer ----------
const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)]
const rndInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const iso = (date) => date.toISOString()
function daysAgo(days, hours = 0, mins = 0) {
  return new Date(Date.now() - days * 86400000 - hours * 3600000 - mins * 60000)
}
function slugifyName(s) {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z]+/g, '.')
    .replace(/^\.|\.$/g, '')
}

const firstNamesM = ['Thomas', 'Michael', 'Andreas', 'Stefan', 'Markus', 'Frank', 'Christian', 'Martin', 'Alexander', 'Daniel', 'Sebastian', 'Tobias', 'Florian', 'Matthias', 'Jürgen']
const firstNamesF = ['Sabine', 'Petra', 'Claudia', 'Andrea', 'Susanne', 'Nicole', 'Julia', 'Christina', 'Katrin', 'Stefanie', 'Melanie', 'Anja', 'Birgit', 'Martina', 'Sandra']
const lastNames = ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Hoffmann', 'Schäfer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schröder', 'Neumann', 'Schwarz', 'Zimmermann', 'Braun', 'Krüger', 'Hofmann', 'Lange', 'Werner', 'Krause']
const cities = [
  ['München', '80331'], ['Berlin', '10115'], ['Hamburg', '20095'], ['Köln', '50667'],
  ['Frankfurt', '60311'], ['Stuttgart', '70173'], ['Düsseldorf', '40213'], ['Leipzig', '04109'],
  ['Dortmund', '44135'], ['Essen', '45127'], ['Bremen', '28195'], ['Dresden', '01067'],
  ['Hannover', '30159'], ['Nürnberg', '90402'], ['Freiburg', '79098'], ['Münster', '48143'],
  ['Augsburg', '86150'], ['Bonn', '53111'], ['Karlsruhe', '76131'], ['Mannheim', '68159'],
]
const domains = ['gmail.com', 'web.de', 'gmx.de', 't-online.de', 'outlook.de', 'gmx.net']
const mobilePrefix = ['0151', '0152', '0157', '0160', '0170', '0171', '0175', '0176', '0178']
const sources = [
  'https://www.google.com/', 'https://www.google.com/', 'https://l.facebook.com/',
  'https://www.instagram.com/', 'https://wertblick-immobilien.de/', '',
]
const userAgents = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
]

// Antwort-Optionen (Werte exakt aus der Funnel-Definition ed48feca)
const immobilienart = ['wohnung', 'haus', 'mehrfamilienhaus', 'grundstueck']
const baujahr = ['vor_1960', '1960_1990', '1991_2010', 'nach_2010']
const zustand = ['neuwertig', 'gepflegt', 'renovierungsbeduerftig']
const anlass = ['verkauf', 'erbschaft', 'vermoegensaufteilung', 'neugier']
const zeithorizont = ['sofort', 'in_6_monaten', 'im_jahr', 'offen']

function wohnflaecheFor(art) {
  if (art === 'wohnung') return String(rndInt(45, 130))
  if (art === 'haus') return String(rndInt(110, 260))
  if (art === 'mehrfamilienhaus') return String(rndInt(240, 600))
  return String(rndInt(300, 900)) // grundstueck
}

function randomIp() {
  return `${rndInt(78, 95)}.${rndInt(0, 255)}.${rndInt(0, 255)}.${rndInt(1, 254)}`
}
function randomPhone() {
  return `${rnd(mobilePrefix)} ${rndInt(1000000, 9999999)}`
}

const notesWorked = [
  'Telefonisch erreicht – Rückruf für morgen 10 Uhr vereinbart.',
  'Sehr motiviert, Verkauf zeitnah geplant. Vor-Ort-Termin steht.',
  'Unterlagen angefordert (Grundriss, Energieausweis).',
  'Angebot versendet, wartet Rücksprache mit Ehepartner ab.',
  'Nicht erreicht, zweiter Versuch am Nachmittag.',
  'Termin zur Objektbesichtigung am Freitag.',
  'Erbengemeinschaft, Entscheidung dauert noch. In 3 Wochen nachfassen.',
]
const notesDone = [
  'Maklerauftrag unterschrieben – Vermarktung startet.',
  'Objekt erfolgreich vermittelt.',
  'Bewertung übergeben, Kunde sehr zufrieden.',
]

function makeIdentity() {
  const female = Math.random() < 0.5
  const first = female ? rnd(firstNamesF) : rnd(firstNamesM)
  const last = rnd(lastNames)
  const name = `${first} ${last}`
  const [city, plz] = rnd(cities)
  const email = `${slugifyName(first)}.${slugifyName(last)}@${rnd(domains)}`
  return { name, email, city, plz, phone: randomPhone() }
}

function makeAnswers(hot) {
  const art = rnd(immobilienart)
  // "Heisse" Leads tendieren zu Verkauf + kurzem Zeithorizont
  const an = hot ? rnd(['verkauf', 'verkauf', 'erbschaft', 'vermoegensaufteilung'])
                 : rnd(anlass)
  const zh = hot ? rnd(['sofort', 'in_6_monaten', 'in_6_monaten', 'im_jahr'])
                 : (an === 'neugier' ? 'offen' : rnd(zeithorizont))
  return {
    immobilienart: art,
    wohnflaeche: wohnflaecheFor(art),
    baujahr: rnd(baujahr),
    zustand: hot ? rnd(['neuwertig', 'gepflegt', 'gepflegt']) : rnd(zustand),
    anlass: an,
    zeithorizont: zh,
  }
}

async function main() {
  console.log('→ Demo-Konto wird provisioniert …\n')

  // 1) Auth-User (bestaetigt) anlegen oder finden
  let userId
  {
    const { data, error } = await sb.auth.admin.createUser({
      email: EMAIL, password: PASSWORD, email_confirm: true,
    })
    if (error) {
      // evtl. existiert schon -> suchen
      console.log(`  createUser: ${error.message} – suche bestehenden User …`)
      let page = 1, found = null
      while (!found && page <= 20) {
        const { data: list, error: le } = await sb.auth.admin.listUsers({ page, perPage: 200 })
        if (le) throw le
        found = list.users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase())
        if (list.users.length < 200) break
        page++
      }
      if (!found) throw new Error('User existiert laut Fehler, wurde aber nicht gefunden.')
      userId = found.id
      // Passwort + Bestaetigung sicherstellen
      await sb.auth.admin.updateUserById(userId, { password: PASSWORD, email_confirm: true })
    } else {
      userId = data.user.id
    }
  }
  console.log(`  ✔ Auth-User: ${EMAIL}  (id ${userId})`)

  // 2) Tenant + Membership (reuse falls vorhanden)
  let tenantId
  {
    const { data: mem } = await sb.from('tenant_members').select('tenant_id').eq('auth_user_id', userId).limit(1)
    if (mem && mem.length) {
      tenantId = mem[0].tenant_id
      await sb.from('tenants').update({ company_name: COMPANY_NAME, billing_model: 'free', is_active: true }).eq('id', tenantId)
    } else {
      const { data: t, error: te } = await sb.from('tenants')
        .insert({ company_name: COMPANY_NAME, billing_model: 'free', is_active: true })
        .select('id').single()
      if (te) throw te
      tenantId = t.id
      const { error: me } = await sb.from('tenant_members')
        .insert({ tenant_id: tenantId, auth_user_id: userId, role: 'owner' })
      if (me) throw me
    }
  }
  console.log(`  ✔ Tenant: ${COMPANY_NAME}  (id ${tenantId})`)

  // 3) Bestehenden Demo-Funnel dieses Slugs (nur eigener Tenant) sauber abraeumen
  {
    const { data: existing } = await sb.from('funnels').select('id, tenant_id').eq('slug', NEW_SLUG).maybeSingle()
    if (existing) {
      if (existing.tenant_id !== tenantId) {
        throw new Error(`Slug "${NEW_SLUG}" gehoert einem anderen Tenant – bitte anderen Slug waehlen.`)
      }
      await sb.from('submissions').delete().eq('funnel_slug', NEW_SLUG)
      await sb.from('funnel_view_logs').delete().eq('funnel_id', existing.id)
      await sb.from('funnels').delete().eq('id', existing.id) // CASCADE raeumt pages/fields
      console.log('  ↺ Vorheriger Demo-Funnel + Leads/Views entfernt (re-run).')
    }
  }

  // 4) Quell-Funnel laden
  const { data: src, error: se } = await sb.from('funnels').select('*').eq('slug', SOURCE_SLUG).single()
  if (se) throw se

  const copyCols = [
    'contact_form_title', 'contact_form_subtitle', 'success_message', 'response_message',
    'answers_overview_label', 'privacy_text', 'privacy_policy_url', 'show_answers_overview',
    'show_progress_bar', 'show_step_badge', 'title_alignment', 'hide_contact_warning',
    'redirect_url', 'email_sender_local', 'primary_color', 'text_color', 'background_color',
    'page_background_color', 'font', 'border_radius', 'max_width', 'icon_color',
  ]
  const funnelRow = { slug: NEW_SLUG, tenant_id: tenantId, funnel_name: FUNNEL_NAME, notification_email: EMAIL, is_active: true }
  for (const c of copyCols) funnelRow[c] = src[c]

  const { data: nf, error: nfe } = await sb.from('funnels').insert(funnelRow).select('id').single()
  if (nfe) throw nfe
  const funnelId = nf.id
  console.log(`  ✔ Funnel: ${FUNNEL_NAME}  (slug ${NEW_SLUG}, id ${funnelId})`)

  // 5) Pages + Fields klonen
  const { data: srcPages, error: spe } = await sb.from('pages').select('*').eq('funnel_id', src.id).order('sort_order')
  if (spe) throw spe
  const pageMap = {} // old.id -> new.id
  for (const p of srcPages) {
    const { data: np, error: npe } = await sb.from('pages')
      .insert({ funnel_id: funnelId, page_type: p.page_type, sort_order: p.sort_order, config: p.config })
      .select('id').single()
    if (npe) throw npe
    pageMap[p.id] = np.id
  }
  const srcPageIds = srcPages.map((p) => p.id)
  const { data: srcFields, error: sfe } = await sb.from('fields').select('*').in('page_id', srcPageIds)
  if (sfe) throw sfe
  if (srcFields.length) {
    const fieldRows = srcFields.map((f) => ({
      page_id: pageMap[f.page_id], field_key: f.field_key, field_type: f.field_type,
      label: f.label, subtitle: f.subtitle, placeholder: f.placeholder, visible: f.visible,
      required: f.required, sort_order: f.sort_order, options: f.options, config: f.config,
    }))
    const { error: ife } = await sb.from('fields').insert(fieldRows)
    if (ife) throw ife
  }
  console.log(`  ✔ ${srcPages.length} Pages + ${srcFields.length} Fields geklont`)

  // 6) Leads generieren
  const subs = []
  // Status-Verteilung der abgeschlossenen Leads
  const statuses = []
  for (let i = 0; i < 13; i++) statuses.push('offen')
  for (let i = 0; i < 10; i++) statuses.push('kontaktiert')
  for (let i = 0; i < 7; i++) statuses.push('abgeschlossen')
  while (statuses.length < N_COMPLETED) statuses.push('offen')

  for (let i = 0; i < N_COMPLETED; i++) {
    const status = statuses[i]
    const hot = status !== 'offen' || Math.random() < 0.4
    const id8 = makeIdentity()
    const ans = makeAnswers(hot)
    // Alter nach Status: erledigt aelter, neu juenger
    let dAge
    if (status === 'abgeschlossen') dAge = rndInt(13, 27)
    else if (status === 'kontaktiert') dAge = rndInt(4, 18)
    else dAge = rndInt(0, 9)
    const created = daysAgo(dAge, rndInt(0, 23), rndInt(0, 59))
    const completed = new Date(created.getTime() + rndInt(2, 18) * 60000)
    // Notizen
    let notes = null
    if (status === 'abgeschlossen') notes = rnd(notesDone)
    else if (status === 'kontaktiert' && Math.random() < 0.7) notes = rnd(notesWorked)
    else if (status === 'offen' && Math.random() < 0.2) notes = rnd(notesWorked)

    const answers = {
      ...ans,
      name: id8.name, email: id8.email, telefon: id8.phone, plz: id8.plz,
    }
    const contact = { name: id8.name, email: id8.email, telefon: id8.phone, plz: id8.plz }

    subs.push({
      session_id: crypto.randomUUID(),
      tenant_id: tenantId,
      funnel_slug: NEW_SLUG,
      tenant_slug: null,
      contact, answers,
      lead_price: 0,
      source_url: rnd(sources),
      user_agent: rnd(userAgents),
      ip_address: randomIp(),
      status,
      notes,
      completed_at: iso(completed),
      created_at: iso(created),
    })
  }

  // 7) Abgebrochene (partial) – 4 mit E-Mail, 4 ohne
  for (let i = 0; i < N_ABANDONED; i++) {
    const withEmail = i < 4
    const id8 = makeIdentity()
    const art = rnd(immobilienart)
    const answers = { immobilienart: art }
    if (Math.random() < 0.6) answers.wohnflaeche = wohnflaecheFor(art)
    if (Math.random() < 0.4) answers.baujahr = rnd(baujahr)
    const contact = {}
    if (withEmail) {
      answers.email = id8.email
      contact.email = id8.email
      if (Math.random() < 0.5) { answers.name = id8.name; contact.name = id8.name }
    }
    const created = daysAgo(rndInt(0, 13), rndInt(0, 23), rndInt(0, 59))
    subs.push({
      session_id: crypto.randomUUID(),
      tenant_id: tenantId,
      funnel_slug: NEW_SLUG,
      tenant_slug: null,
      contact, answers,
      lead_price: 0,
      source_url: rnd(sources),
      user_agent: rnd(userAgents),
      ip_address: randomIp(),
      status: 'offen',
      notes: null,
      completed_at: null,
      created_at: iso(created),
    })
  }

  const { error: subErr } = await sb.from('submissions').insert(subs)
  if (subErr) throw subErr
  console.log(`  ✔ ${N_COMPLETED} abgeschlossene + ${N_ABANDONED} abgebrochene Leads angelegt`)

  // 8) Aufrufe (funnel_view_logs)
  const views = []
  for (let i = 0; i < N_VIEWS; i++) {
    const when = daysAgo(rndInt(0, 27), rndInt(0, 23), rndInt(0, 59))
    views.push({ funnel_id: funnelId, tenant_id: tenantId, viewed_at: iso(when) })
  }
  const { error: vErr } = await sb.from('funnel_view_logs').insert(views)
  if (vErr) throw vErr
  console.log(`  ✔ ${N_VIEWS} Aufrufe angelegt (Conversion ~${Math.round((N_COMPLETED / N_VIEWS) * 100)}%)`)

  console.log('\n========================================')
  console.log('  DEMO-KONTO FERTIG')
  console.log('========================================')
  console.log(`  Login:    https://app.leadplug.de/login`)
  console.log(`  E-Mail:   ${EMAIL}`)
  console.log(`  Passwort: ${PASSWORD}`)
  console.log(`  Funnel:   ${FUNNEL_NAME}  →  app.leadplug.de/${NEW_SLUG}`)
  console.log('========================================\n')
}

main().catch((e) => {
  console.error('\n✖ FEHLER:', e.message || e)
  process.exit(1)
})

'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { MoreHorizontal, Mail, Power, ExternalLink, Search, Check, Copy, TriangleAlert, X } from 'lucide-react'
import StatTile from '@/components/ui/StatTile'
import { ConfirmModal } from '@/components/admin/WorkspaceDangerZone'
import type { WorkspaceRow } from '@/lib/admin/queries'

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtRelative(iso: string | null): string {
  if (!iso) return '—'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'heute'
  if (days === 1) return 'gestern'
  if (days < 30) return `vor ${days} T.`
  const months = Math.floor(days / 30)
  if (months < 12) return `vor ${months} Mon.`
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

type Tone = 'gray' | 'amber' | 'blue' | 'green' | 'red'
const TONE: Record<Tone, string> = {
  gray:  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  blue:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  red:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

function statusOf(w: WorkspaceRow): { label: string; tone: Tone } {
  if (!w.isActive) return { label: 'Deaktiviert', tone: 'red' }
  if (w.funnelCount === 0) return { label: 'Kein Funnel', tone: 'gray' }
  if (w.viewCount === 0) return { label: 'Ohne Traffic', tone: 'amber' }
  if (w.leadCount === 0) return { label: 'Live · 0 Leads', tone: 'blue' }
  return { label: 'Leads ✓', tone: 'green' }
}

function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      title="Klicken zum Kopieren"
      onClick={(e) => {
        e.stopPropagation()
        navigator.clipboard?.writeText(email).then(() => {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1500)
        })
      }}
      className="group/c flex min-w-0 cursor-pointer items-center gap-1.5 text-left text-sm text-gray-600 transition hover:text-primary dark:text-gray-300"
    >
      <span className="truncate">{email}</span>
      {copied
        ? <Check size={13} className="shrink-0 text-green-500" />
        : <Copy size={13} className="shrink-0 text-gray-300 opacity-0 transition group-hover/c:opacity-100 dark:text-gray-600" />}
    </button>
  )
}

// ── Row-Aktionen (Dropdown) — Löschen liegt in der Workspace-Einsicht, nicht hier ─

function RowActions({ w, busy, onPlan, onToggleActive }: {
  w: WorkspaceRow
  busy: boolean
  onPlan: (model: string) => void
  onToggleActive: () => void
}) {
  const [open, setOpen] = useState(false)
  // Aufgabe 59: gestyltes Bestätigungs-Modal statt window.confirm (Design-System-Angleich).
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const item = 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
  const cap = 'px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        aria-label="Aktionen"
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 dark:hover:bg-gray-800 dark:hover:text-gray-200"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <Link href={`/dashboard/admin/${w.tenantId}`} className={item} onClick={() => setOpen(false)}>
            <ExternalLink size={14} className="text-gray-400" /> Details öffnen
          </Link>
          {w.ownerEmail && (
            <a href={`mailto:${w.ownerEmail}`} className={item} onClick={() => setOpen(false)}>
              <Mail size={14} className="text-gray-400" /> Owner anschreiben
            </a>
          )}

          <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
          <p className={cap}>Plan</p>
          <button type="button" className={item} onClick={() => { onPlan('free'); setOpen(false) }}>
            <span className="w-3.5">{w.billingModel === 'free' && <Check size={14} className="text-primary" />}</span> Free
          </button>
          <button type="button" className={item} onClick={() => { onPlan('per_month'); setOpen(false) }}>
            <span className="w-3.5">{w.billingModel === 'per_month' && <Check size={14} className="text-primary" />}</span> Bezahlt (Monat)
          </button>

          <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
          <button
            type="button"
            className={item}
            onClick={() => {
              setOpen(false)
              if (w.isActive) setConfirmDeactivate(true)
              else onToggleActive()
            }}
          >
            <Power size={14} className="text-gray-400" /> {w.isActive ? 'Deaktivieren' : 'Reaktivieren'}
          </button>
        </div>
      )}
      {confirmDeactivate && (
        <ConfirmModal
          title="Konto deaktivieren?"
          message="Alle Funnels dieses Kontos gehen offline — eingebettete iFrames auf Kundenseiten zeigen dann nichts mehr. Lässt sich jederzeit rückgängig machen."
          confirmLabel="Deaktivieren"
          danger
          busy={busy}
          onClose={() => setConfirmDeactivate(false)}
          onConfirm={() => {
            setConfirmDeactivate(false)
            onToggleActive()
          }}
        />
      )}
    </div>
  )
}

// ── Cockpit ──────────────────────────────────────────────────────────────────

export default function WorkspacesCockpit({ workspaces, myEmail }: {
  workspaces: WorkspaceRow[]
  myEmail: string
}) {
  const [rows, setRows] = useState<WorkspaceRow[]>(workspaces)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('created')
  const [busyId, setBusyId] = useState<string | null>(null)
  // Aufgabe 60: Inline-Fehlerbanner statt alert() (letzter nativer Browser-Dialog der App).
  const [actionError, setActionError] = useState<string | null>(null)

  const kpi = useMemo(() => ({
    activeWorkspaces: rows.filter((w) => w.isActive).length,
    activeFunnels: rows.reduce((s, w) => s + w.activeFunnelCount, 0),
    views: rows.reduce((s, w) => s + w.viewCount, 0),
    leads: rows.reduce((s, w) => s + w.leadCount, 0),
  }), [rows])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    const list = rows.filter((w) =>
      !q || (w.companyName ?? '').toLowerCase().includes(q) || (w.ownerEmail ?? '').toLowerCase().includes(q))
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'active': return new Date(b.lastSignInAt ?? 0).getTime() - new Date(a.lastSignInAt ?? 0).getTime()
        case 'leads':  return b.leadCount - a.leadCount
        case 'name':   return (a.companyName ?? '').localeCompare(b.companyName ?? '')
        default:       return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })
  }, [rows, query, sort])

  async function patch(id: string, body: Record<string, unknown>, optimistic: (w: WorkspaceRow) => WorkspaceRow) {
    const snapshot = rows
    setBusyId(id)
    setActionError(null)
    setRows((rs) => rs.map((w) => (w.tenantId === id ? optimistic(w) : w)))
    try {
      const res = await fetch(`/api/admin/workspaces/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
    } catch {
      setRows(snapshot)
      setActionError('Aktion fehlgeschlagen — die Änderung wurde zurückgenommen. Bitte erneut versuchen.')
    } finally {
      setBusyId(null)
    }
  }

  function onPlan(w: WorkspaceRow, model: string) {
    if (w.billingModel === model) return
    patch(w.tenantId, { billing_model: model }, (x) => ({ ...x, billingModel: model }))
  }
  function onToggleActive(w: WorkspaceRow) {
    patch(w.tenantId, { is_active: !w.isActive }, (x) => ({ ...x, isActive: !x.isActive }))
  }

  return (
    <div className="flex flex-col gap-6">
      {actionError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/40 dark:bg-red-900/10 dark:text-red-400">
          <TriangleAlert size={15} className="mt-0.5 shrink-0" />
          <span className="flex-1">{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label="Fehlermeldung schließen"
            className="-m-1 shrink-0 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Kennzahlen */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile value={kpi.activeWorkspaces} label="Aktive Konten" />
        <StatTile value={kpi.activeFunnels} label="Aktive Formulare" />
        <StatTile value={kpi.views} label="Aufrufe" />
        <StatTile value={kpi.leads} label="Leads" />
      </div>

      {/* Tabelle — Karten-Look wie <Card> (rounded-2xl + shadow-sm, design-system.md §4) */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Konten</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name oder E-Mail…"
                className="w-full rounded-xl border border-gray-300 bg-white pl-8 pr-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white sm:w-56"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 outline-none focus:border-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="created">Neueste Signups</option>
              <option value="active">Zuletzt aktiv</option>
              <option value="leads">Meiste Leads</option>
              <option value="name">Name (A–Z)</option>
            </select>
          </div>
        </div>

        {/* Aufgabe 60: x-scrollbar statt Seiten-Overflow — auf schmalen Screens scrollt die
            Tabelle innerhalb der Karte (-mx-4/px-4 nutzt das Card-Padding als Scroll-Rand).
            whitespace-nowrap im Kopf: Überschriften brechen nie zweizeilig um. */}
        <div className="-mx-4 overflow-x-auto px-4">
          <div className="min-w-220">
          {/* Kopf */}
          <div className="flex items-center gap-3 whitespace-nowrap border-b border-gray-100 px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-800 dark:text-gray-500">
            <span className="w-64">Konto</span>
            <span className="flex-1">Owner</span>
            <span className="w-28">Status</span>
            <span className="w-20 text-center">Plan</span>
            <span className="w-14 text-right">Funnels</span>
            <span className="w-12 text-right">Leads</span>
            <span className="w-20 text-right">Login</span>
            <span className="w-24 text-right">Letzter Lead</span>
            <span className="w-10" />
          </div>

          {filtered.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-gray-400">Keine Konten gefunden.</p>
          ) : (
            filtered.map((w) => {
              const isMe = !!w.ownerEmail && w.ownerEmail.toLowerCase() === myEmail
              const st = statusOf(w)
              const isFree = w.billingModel === 'free'
              return (
                <div
                  key={w.tenantId}
                  className={`flex items-center gap-3 border-b border-gray-50 px-2 py-3 dark:border-gray-800/60 ${busyId === w.tenantId ? 'opacity-50' : ''}`}
                >
                  <span className="w-64 min-w-0">
                    <Link href={`/dashboard/admin/${w.tenantId}`} title={w.companyName ?? ''} className="flex items-center gap-2 truncate text-sm font-medium text-gray-900 hover:text-primary dark:text-white">
                      <span className="truncate">{w.companyName || '—'}</span>
                      {isMe && <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">du</span>}
                    </Link>
                  </span>
                  <span className="flex min-w-0 flex-1 items-center">
                    {w.ownerEmail
                      ? <CopyEmail email={w.ownerEmail} />
                      : <span className="italic text-sm text-gray-400 dark:text-gray-500">kein Owner</span>}
                  </span>
                  <span className="w-28">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TONE[st.tone]}`}>{st.label}</span>
                  </span>
                  <span className="w-20 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${isFree ? TONE.blue : TONE.green}`}>
                      {w.billingModel ?? '—'}
                    </span>
                  </span>
                  <span className="w-14 text-right text-sm text-gray-600 dark:text-gray-300">{w.funnelCount}</span>
                  <span className="w-12 text-right text-sm font-semibold text-gray-900 dark:text-white">{w.leadCount}</span>
                  <span className="w-20 text-right text-sm text-gray-500 dark:text-gray-400">{fmtRelative(w.lastSignInAt)}</span>
                  <span className="w-24 text-right text-sm text-gray-500 dark:text-gray-400">{fmtRelative(w.lastLeadAt)}</span>
                  <span className="flex w-10 justify-end">
                    <RowActions
                      w={w}
                      busy={busyId === w.tenantId}
                      onPlan={(m) => onPlan(w, m)}
                      onToggleActive={() => onToggleActive(w)}
                    />
                  </span>
                </div>
              )
            })
          )}
          </div>
        </div>
      </div>
    </div>
  )
}

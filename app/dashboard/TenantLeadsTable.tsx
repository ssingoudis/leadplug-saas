'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Search, Check, Pencil, Plus, List, Columns3, X } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Select } from '@/components/ui/Input'

// ─── Status-Modell (Aufgabe 46) ───────────────────────────────────────────────
// DB-Werte bleiben offen/kontaktiert/abgeschlossen; das UI labelt sie neu.
export type LeadStatus = 'offen' | 'kontaktiert' | 'abgeschlossen'

const STATUS_ORDER: LeadStatus[] = ['offen', 'kontaktiert', 'abgeschlossen']
const STATUS_LABEL: Record<LeadStatus, string> = {
  offen: 'Neu',
  kontaktiert: 'Kontaktiert',
  abgeschlossen: 'Erledigt',
}
const STATUS_PILL: Record<LeadStatus, string> = {
  offen:         'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  kontaktiert:   'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  abgeschlossen: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
}
const STATUS_DOT: Record<LeadStatus, string> = {
  offen:         'bg-amber-500',
  kontaktiert:   'bg-purple-500',
  abgeschlossen: 'bg-green-500',
}

type QuestionMeta = {
  question_key: string
  title: string
  options: Array<{ value: string; label: string }>
}

export type TenantSubmission = {
  id: string
  created_at: string
  completed_at: string | null
  status: LeadStatus
  notes: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  contact_anrede: string | null
  contact: Record<string, string> | null
  answers: Record<string, string> | null
  funnel_slug: string
  funnel_name: string
  questions: QuestionMeta[]
}

export type FunnelOption = {
  slug: string
  name: string
}

function resolveAnswer(key: string, val: string, questions: QuestionMeta[]): string {
  const q = questions.find((q) => q.question_key === key)
  if (!q) return val
  const options = Array.isArray(q.options) ? q.options : []
  if (options.length === 0) return val
  return val
    .split(',')
    .map((v) => options.find((o) => o.value === v.trim())?.label ?? v.trim())
    .join(', ')
}

function displayName(s: TenantSubmission): string {
  return [s.contact_anrede, s.contact_name].filter(Boolean).join(' ') || '—'
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// ─── Status-Badge mit Dropdown (in der Zeile) ─────────────────────────────────

function StatusMenu({ value, onChange }: { value: LeadStatus; onChange: (s: LeadStatus) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition hover:ring-2 hover:ring-primary/20 ${STATUS_PILL[value]}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[value]}`} />
        {STATUS_LABEL[value]}
        <ChevronDown size={12} className="opacity-60" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-1 shadow-lg">
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { onChange(s); setOpen(false) }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[s]}`} />
              <span className="flex-1">{STATUS_LABEL[s]}</span>
              {s === value && <Check size={14} className="text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Notiz-Editor (gesperrt bis Klick) ────────────────────────────────────────

function NotesEditor({
  submissionId,
  value,
  onSaved,
}: {
  submissionId: string
  value: string | null
  onSaved: (notes: string | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const [saving, setSaving] = useState(false)

  // Beim Wechsel auf einen anderen Lead zurück in den Anzeige-Modus.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setEditing(false); setDraft(value ?? '') }, [submissionId])

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/leads/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: draft }),
      })
      if (!res.ok) throw new Error('save failed')
      const saved = draft.trim().length > 0 ? draft.trim() : null
      onSaved(saved)
      setDraft(saved ?? '')
      setEditing(false)
    } catch {
      // bei Fehler im Bearbeiten-Modus bleiben
    } finally {
      setSaving(false)
    }
  }

  function cancel() {
    setDraft(value ?? '')
    setEditing(false)
  }

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Notiz</p>
      {!editing ? (
        value ? (
          // Anzeige-Modus: Notiz steht da, Bearbeiten erst nach Stift-Klick (nicht permanent editierbar).
          <div className="relative rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/50">
            <p className="whitespace-pre-wrap pr-8 text-sm text-gray-700 dark:text-gray-200">{value}</p>
            <button
              type="button"
              onClick={() => { setDraft(value); setEditing(true) }}
              aria-label="Notiz bearbeiten"
              title="Notiz bearbeiten"
              className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            >
              <Pencil size={12} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setDraft(''); setEditing(true) }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 transition-colors hover:border-primary/50 hover:text-primary dark:border-gray-600 dark:text-gray-400"
          >
            <Plus size={14} />
            Notiz hinzufügen
          </button>
        )
      ) : (
        <div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            placeholder="Interne Notiz zu diesem Lead… (z. B. Rückruf vereinbart, kein Interesse)"
            rows={4}
            className="w-full resize-y rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-300 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-600"
          />
          <div className="mt-2 flex justify-end gap-1.5">
            <button
              type="button"
              onClick={cancel}
              disabled={saving}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              {saving ? 'Speichert…' : 'Speichern'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Detail-Inhalt (Kontakt + Antworten + Status + Notiz) ─────────────────────

function LeadDetailBody({
  s,
  onStatus,
  onNotesSaved,
}: {
  s: TenantSubmission
  onStatus: (st: LeadStatus) => void
  onNotesSaved: (n: string | null) => void
}) {
  const extraContact = Object.entries(s.contact ?? {}).filter(
    ([key]) => !['anrede', 'name', 'email', 'telefon'].includes(key)
  )

  return (
    <div className="px-5 py-5">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Kontakt */}
        <div className="space-y-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Kontakt</p>
          {[
            { label: 'Anrede', value: s.contact_anrede },
            { label: 'Name', value: s.contact_name },
            { label: 'E-Mail', value: s.contact_email },
            { label: 'Telefon', value: s.contact_phone },
          ].map(({ label, value }) =>
            value ? (
              <div key={label}>
                <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
              </div>
            ) : null
          )}
          {extraContact.map(([key, value]) =>
            value ? (
              <div key={key}>
                <p className="text-xs text-gray-400 dark:text-gray-500">{key}</p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
              </div>
            ) : null
          )}
        </div>

        {/* Antworten */}
        <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Antworten</p>
          {Object.keys(s.answers ?? {}).length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Keine Antworten — Funnel wurde nicht zu Ende ausgefüllt.
            </p>
          ) : (
            <div className="space-y-2">
              {Object.entries(s.answers ?? {}).map(([key, val]) => {
                const q = s.questions.find((q) => q.question_key === key)
                const label = q?.title?.replace('?', '') ?? key
                const answer = resolveAnswer(key, val, s.questions)
                return (
                  <div key={key}>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{answer}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Status + Notiz */}
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Status</p>
          <div className="inline-flex rounded-xl border border-gray-200 p-1 dark:border-gray-700">
            {STATUS_ORDER.map((st) => {
              const active = s.status === st
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => onStatus(st)}
                  className={
                    active
                      ? `rounded-lg px-3 py-1.5 text-sm font-medium ${STATUS_PILL[st]}`
                      : 'rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                  }
                >
                  {STATUS_LABEL[st]}
                </button>
              )
            })}
          </div>
        </div>
        <NotesEditor submissionId={s.id} value={s.notes} onSaved={onNotesSaved} />
      </div>
    </div>
  )
}

// Inline-aufklappbare Detail-Variante für die Listen-Ansicht.
function ExpandedDetail(props: {
  s: TenantSubmission
  onStatus: (st: LeadStatus) => void
  onNotesSaved: (n: string | null) => void
}) {
  return (
    <div className="border-t border-primary/20 bg-white dark:bg-gray-900">
      <LeadDetailBody {...props} />
    </div>
  )
}

// Modal-Detail-Variante für die Board-Ansicht (Klick auf Karte).
function LeadDetailModal({
  s,
  onClose,
  onStatus,
  onNotesSaved,
}: {
  s: TenantSubmission
  onClose: () => void
  onStatus: (st: LeadStatus) => void
  onNotesSaved: (n: string | null) => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white shadow-xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{displayName(s)}</p>
            <p className="text-xs text-gray-400">{fmtDate(s.created_at)} · {s.funnel_name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <X size={18} />
          </button>
        </div>
        <LeadDetailBody s={s} onStatus={onStatus} onNotesSaved={onNotesSaved} />
      </div>
    </div>
  )
}

// ─── Kanban (Board-Ansicht) ───────────────────────────────────────────────────

function CardFace({ s, showFunnel }: { s: TenantSubmission; showFunnel: boolean }) {
  return (
    <div>
      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{displayName(s)}</p>
      <p className="truncate text-xs text-gray-400">{s.contact_email ?? s.contact_phone}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[10px] text-gray-400">{fmtDate(s.created_at)}</span>
        {showFunnel && (
          <span className="max-w-28 truncate text-[10px] text-gray-400 dark:text-gray-500">{s.funnel_name}</span>
        )}
      </div>
    </div>
  )
}

function KanbanCard({ s, showFunnel, onOpen }: { s: TenantSubmission; showFunnel: boolean; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: s.id })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onOpen}
      className={`cursor-grab touch-none rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition active:cursor-grabbing dark:border-gray-700 dark:bg-gray-900 ${
        isDragging ? 'opacity-40' : 'hover:border-primary/40 hover:shadow'
      }`}
    >
      <CardFace s={s} showFunnel={showFunnel} />
    </div>
  )
}

function KanbanColumn({
  status,
  cards,
  showFunnel,
  onOpenCard,
}: {
  status: LeadStatus
  cards: TenantSubmission[]
  showFunnel: boolean
  onOpenCard: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="flex w-72 shrink-0 flex-col sm:w-auto sm:min-w-64 sm:flex-1">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{STATUS_LABEL[status]}</span>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-200 px-1.5 text-[10px] font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          {cards.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-32 flex-1 flex-col gap-2 rounded-xl border-2 border-dashed p-2 transition-colors ${
          isOver ? 'border-primary/50 bg-primary/5' : 'border-gray-200 dark:border-gray-800'
        }`}
      >
        {cards.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-gray-400 dark:text-gray-500">Keine Leads</p>
        ) : (
          cards.map((s) => (
            <KanbanCard key={s.id} s={s} showFunnel={showFunnel} onOpen={() => onOpenCard(s.id)} />
          ))
        )}
      </div>
    </div>
  )
}

const dateInputClass = "w-full rounded-lg border-0 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white outline-none cursor-pointer"

const TABS: Array<{ key: 'alle' | LeadStatus; label: string }> = [
  { key: 'alle', label: 'Alle' },
  { key: 'offen', label: 'Neu' },
  { key: 'kontaktiert', label: 'Kontaktiert' },
  { key: 'abgeschlossen', label: 'Erledigt' },
]

export default function TenantLeadsTable({
  submissions,
  funnels,
}: {
  submissions: TenantSubmission[]
  funnels: FunnelOption[]
}) {
  const [rows, setRows]             = useState<TenantSubmission[]>(submissions)
  const [view, setView]             = useState<'list' | 'board'>('list')
  const [openId, setOpenId]         = useState<string | null>(null)
  const [detailId, setDetailId]     = useState<string | null>(null)
  const [query, setQuery]           = useState('')
  const [funnelFilter, setFunnelFilter] = useState('alle')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')
  const [sortBy, setSortBy]         = useState('date_desc')
  const [statusTab, setStatusTab]   = useState<'alle' | LeadStatus>('alle')
  const [activeId, setActiveId]     = useState<string | null>(null)
  const justDragged = useRef(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // Zähler pro Status (vor Filter) für die Tab-Badges.
  const counts = useMemo(() => ({
    alle: rows.length,
    offen: rows.filter((s) => s.status === 'offen').length,
    kontaktiert: rows.filter((s) => s.status === 'kontaktiert').length,
    abgeschlossen: rows.filter((s) => s.status === 'abgeschlossen').length,
  }), [rows])

  const funnelOptions = [
    { value: 'alle', label: 'Alle Funnels' },
    ...funnels.map((f) => ({ value: f.slug, label: f.name })),
  ]

  // Optimistisches Status-Update + PATCH. Bei Fehler Rollback.
  async function updateStatus(id: string, next: LeadStatus) {
    const prev = rows.find((r) => r.id === id)?.status
    if (!prev || prev === next) return
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: next } : r)))
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) throw new Error('status update failed')
    } catch {
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: prev } : r)))
    }
  }

  function applyNotes(id: string, notes: string | null) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, notes } : r)))
  }

  // Gemeinsame Filter (ohne Status, ohne Sort) — Basis für Liste + Board.
  const baseFiltered = useMemo(() => {
    const q = query.toLowerCase()
    return rows.filter((s) => {
      if (q && !(s.contact_name ?? '').toLowerCase().includes(q) &&
               !(s.contact_email ?? '').toLowerCase().includes(q) &&
               !(s.contact_phone ?? '').toLowerCase().includes(q)) return false
      if (funnelFilter !== 'alle' && s.funnel_slug !== funnelFilter) return false
      if (dateFrom) {
        const from = new Date(dateFrom)
        from.setHours(0, 0, 0, 0)
        if (new Date(s.created_at) < from) return false
      }
      if (dateTo) {
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        if (new Date(s.created_at) > to) return false
      }
      return true
    })
  }, [rows, query, funnelFilter, dateFrom, dateTo])

  // Listen-Ansicht: Status-Tab + Sortierung.
  const listRows = useMemo(() => {
    const result = baseFiltered.filter((s) => statusTab === 'alle' || s.status === statusTab)
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'status':    return (STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
                              || (new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        default:          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })
  }, [baseFiltered, sortBy, statusTab])

  // Board-Ansicht: nach Status gruppiert, je Spalte neueste zuerst.
  const boardColumns = useMemo(() => {
    const map: Record<LeadStatus, TenantSubmission[]> = { offen: [], kontaktiert: [], abgeschlossen: [] }
    for (const s of baseFiltered) map[s.status].push(s)
    for (const st of STATUS_ORDER) {
      map[st].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
    return map
  }, [baseFiltered])

  function handleDragStart(e: DragStartEvent) {
    justDragged.current = true
    setActiveId(String(e.active.id))
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    // Klick-Unterdrückung kurz nach echtem Drag.
    setTimeout(() => { justDragged.current = false }, 0)
    const overId = e.over?.id
    if (!overId) return
    if ((STATUS_ORDER as string[]).includes(String(overId))) {
      updateStatus(String(e.active.id), overId as LeadStatus)
    }
  }

  function handleDragCancel() {
    setActiveId(null)
    setTimeout(() => { justDragged.current = false }, 0)
  }

  const hasActiveFilters = query || funnelFilter !== 'alle' || dateFrom || dateTo
  const showFunnel = funnels.length > 1
  const activeLead = activeId ? rows.find((r) => r.id === activeId) ?? null : null
  const detailLead = detailId ? rows.find((r) => r.id === detailId) ?? null : null

  function renderViewToggle() {
    return (
      <div className="inline-flex rounded-xl border border-gray-200 p-0.5 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setView('list')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            view === 'list' ? 'bg-primary text-primary-foreground' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <List size={15} /> Liste
        </button>
        <button
          type="button"
          onClick={() => setView('board')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            view === 'board' ? 'bg-primary text-primary-foreground' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Columns3 size={15} /> Board
        </button>
      </div>
    )
  }

  function renderSearchAndFunnel() {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <div className="relative min-w-0 sm:w-72">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, E-Mail oder Telefon…"
            className="w-full rounded-xl border border-gray-300 bg-white pl-8 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          />
        </div>
        {showFunnel && (
          <Select value={funnelFilter} onChange={setFunnelFilter} options={funnelOptions} className="sm:w-40" />
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Kopfzeile: Status-Tabs (nur Liste) + View-Umschalter — eine Zeile */}
      <div className={`mb-4 flex flex-wrap items-center justify-between gap-2 ${view === 'list' ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}>
        <div className="flex flex-wrap items-center gap-1">
          {view === 'list' && TABS.map((t) => {
            const active = statusTab === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setStatusTab(t.key)}
                className={
                  active
                    ? "relative -mb-px inline-flex items-center gap-2 border-b-2 border-primary px-3 py-2 text-sm font-semibold text-primary"
                    : "relative -mb-px inline-flex items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                }
              >
                {t.label}
                <span
                  className={
                    active
                      ? "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white"
                      : "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-200 px-1.5 text-[10px] font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  }
                >
                  {counts[t.key]}
                </span>
              </button>
            )
          })}
        </div>
        <div className="pb-2">
          {renderViewToggle()}
        </div>
      </div>

      {view === 'board' ? (
        /* ─── Board-Ansicht ─── */
        <div>
          <div className="mb-4">
            {renderSearchAndFunnel()}
          </div>
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Noch keine Leads eingegangen.</p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <div className="flex gap-3 overflow-x-auto pb-2">
                {STATUS_ORDER.map((st) => (
                  <KanbanColumn
                    key={st}
                    status={st}
                    cards={boardColumns[st]}
                    showFunnel={showFunnel}
                    onOpenCard={(id) => { if (!justDragged.current) setDetailId(id) }}
                  />
                ))}
              </div>
              <DragOverlay>
                {activeLead ? (
                  <div className="w-64 cursor-grabbing rounded-xl border border-primary/40 bg-white p-3 shadow-lg dark:bg-gray-900">
                    <CardFace s={activeLead} showFunnel={showFunnel} />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      ) : (
        /* ─── Listen-Ansicht ─── */
        <div>
          {/* Suche + Funnel */}
          <div className="mb-2">
            {renderSearchAndFunnel()}
          </div>

          {/* Zeile 2: Datum + Sort */}
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex items-center divide-x divide-gray-200 overflow-hidden rounded-xl border border-gray-300 bg-white dark:divide-gray-600 dark:border-gray-600 dark:bg-gray-800">
              <div className="flex items-center gap-1.5 px-3 py-1.5">
                <span className="whitespace-nowrap text-xs text-gray-400 dark:text-gray-500">Von</span>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={dateInputClass} />
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5">
                <span className="whitespace-nowrap text-xs text-gray-400 dark:text-gray-500">Bis</span>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={dateInputClass} />
              </div>
            </div>
            <Select
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: 'date_desc', label: 'Neueste zuerst' },
                { value: 'date_asc',  label: 'Älteste zuerst' },
                { value: 'status',    label: 'Status (Neu → Erledigt)' },
              ]}
              className="sm:w-40"
            />
            {hasActiveFilters && (
              <button
                onClick={() => { setQuery(''); setFunnelFilter('alle'); setDateFrom(''); setDateTo('') }}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 transition hover:border-gray-300 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200"
              >
                Zurücksetzen
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <p className="mb-3 text-xs text-gray-400 dark:text-gray-500">
              {listRows.length} von {counts[statusTab]} Leads
            </p>
          )}

          {listRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              {rows.length === 0 ? 'Noch keine Leads eingegangen.' : 'Keine Ergebnisse für diese Filter.'}
            </p>
          ) : (
            <div className="-mx-6 -mb-6 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
              <AnimatePresence initial={false}>
              {listRows.map((s) => {
                const isOpen = openId === s.id

                return (
                  <motion.div
                    key={s.id}
                    initial={false}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="border-b border-gray-100 last:border-b-0 dark:border-gray-800"
                  >
                    <div
                      onClick={() => setOpenId(isOpen ? null : s.id)}
                      className={`flex cursor-pointer items-center gap-4 px-5 py-4 transition-colors ${isOpen ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800'}`}
                    >
                      <div className="w-24 shrink-0">
                        <p className="text-sm text-gray-500">{fmtDate(s.created_at)}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(s.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                        </p>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{displayName(s)}</p>
                        <p className="truncate text-xs text-gray-400">{s.contact_email ?? s.contact_phone}</p>
                      </div>

                      {showFunnel && (
                        <p className="hidden max-w-36 shrink-0 truncate text-xs text-gray-400 dark:text-gray-500 sm:block">
                          {s.funnel_name}
                        </p>
                      )}

                      <div className="shrink-0">
                        <StatusMenu value={s.status} onChange={(st) => updateStatus(s.id, st)} />
                      </div>

                      <div className={`shrink-0 transition-colors ${isOpen ? 'text-primary/60' : 'text-gray-300'}`}>
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>

                    {isOpen && (
                      <ExpandedDetail
                        s={s}
                        onStatus={(st) => updateStatus(s.id, st)}
                        onNotesSaved={(n) => applyNotes(s.id, n)}
                      />
                    )}
                  </motion.div>
                )
              })}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Board-Detail-Modal */}
      {detailLead && (
        <LeadDetailModal
          s={detailLead}
          onClose={() => setDetailId(null)}
          onStatus={(st) => updateStatus(detailLead.id, st)}
          onNotesSaved={(n) => applyNotes(detailLead.id, n)}
        />
      )}
    </div>
  )
}

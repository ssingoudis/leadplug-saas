'use client'

import { useState, useMemo, useRef, useEffect, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Search, Check, List, Columns3, X, Download } from 'lucide-react'
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
import { useSaveStatus } from '@/lib/hooks/useSaveStatus'
import { SaveStatus } from '@/components/ui/SaveStatus'
import { toCsv, downloadCsv, CSV_EXCEL, CSV_STANDARD, type CsvDialect } from '@/lib/csv'

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
  // Checkbox-Werte lesbar machen (Frage- wie Karten-Checkboxen speichern "true"/"false")
  if (val === 'true') return 'Ja'
  if (val === 'false') return 'Nein'
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

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

// ─── CSV-Export (Aufgabe 69) ──────────────────────────────────────────────────
// Pro Funnel: jeder Funnel bekommt genau seine Spalten. "Smart" = nur Spalten
// mit echtem Inhalt; Choice-Slugs werden zu Labels (resolveAnswer wiederverwendet).

const CSV_CONTACT_LABEL: Record<string, string> = {
  anrede: 'Anrede', name: 'Name', email: 'E-Mail', telefon: 'Telefon',
  plz: 'PLZ', firstName: 'Vorname', lastName: 'Nachname',
}
const CSV_CONTACT_ORDER = ['anrede', 'name', 'email', 'telefon', 'plz']

function buildLeadsMatrix(rows: TenantSubmission[]): string[][] {
  // Kontaktspalten: Vorzugsreihenfolge zuerst, dann weitere Keys (alphabetisch);
  // nur die, die in mind. einer Zeile einen nicht-leeren Wert haben.
  const presentContactKeys = new Set<string>()
  for (const r of rows) {
    for (const [k, v] of Object.entries(r.contact ?? {})) {
      if ((v ?? '').trim()) presentContactKeys.add(k)
    }
  }
  const contactKeys = [
    ...CSV_CONTACT_ORDER.filter((k) => presentContactKeys.has(k)),
    ...[...presentContactKeys].filter((k) => !CSV_CONTACT_ORDER.includes(k)).sort(),
  ]

  // Fragespalten aus den Frage-Metadaten (gleicher Funnel → gleiches Set),
  // nur Fragen mit mind. einer nicht-leeren Antwort. Answer-Keys ohne Metadaten
  // (Altbestand) hängen als Fallback hinten an.
  const answeredKeys = new Set<string>()
  for (const r of rows) {
    for (const [k, v] of Object.entries(r.answers ?? {})) {
      if ((v ?? '').trim()) answeredKeys.add(k)
    }
  }
  const questions = rows[0]?.questions ?? []
  const knownKeys = new Set(questions.map((q) => q.question_key))
  const questionCols = questions.filter((q) => answeredKeys.has(q.question_key))
  const extraAnswerKeys = [...answeredKeys].filter((k) => !knownKeys.has(k))

  const header = [
    'Datum', 'Uhrzeit', 'Status',
    ...contactKeys.map((k) => CSV_CONTACT_LABEL[k] ?? k),
    ...questionCols.map((q) => q.title.replace(/\?\s*$/, '')),
    ...extraAnswerKeys,
    'Notiz',
  ]

  const data = rows.map((r) => [
    fmtDate(r.created_at),
    fmtTime(r.created_at),
    STATUS_LABEL[r.status],
    ...contactKeys.map((k) => r.contact?.[k] ?? ''),
    ...questionCols.map((q) => resolveAnswer(q.question_key, r.answers?.[q.question_key] ?? '', r.questions)),
    ...extraAnswerKeys.map((k) => resolveAnswer(k, r.answers?.[k] ?? '', r.questions)),
    r.notes ?? '',
  ])

  return [header, ...data]
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

// ─── Notiz-Editor (immer editierbar, Autosave on-blur) ────────────────────────

function NotesEditor({
  submissionId,
  value,
  onSaved,
}: {
  submissionId: string
  value: string | null
  onSaved: (notes: string | null) => void
}) {
  const [draft, setDraft] = useState(value ?? '')
  const notesSave = useSaveStatus()
  const taRef = useRef<HTMLTextAreaElement>(null)

  // Bei Lead-Wechsel den Draft auf den gespeicherten Wert zurücksetzen.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setDraft(value ?? '') }, [submissionId])

  // Auto-Grow: Höhe an den Inhalt anpassen, statt horizontal aus dem Feld zu laufen.
  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${ta.scrollHeight}px`
  }, [draft])

  // Aufgabe 50: Autosave on-blur. Speichert nur bei echter Änderung; bei Fehler bleibt der Text
  // im Feld erhalten und der Indikator zeigt „Nicht gespeichert" (kein stiller Verlust).
  async function commit() {
    const trimmed = draft.trim()
    if (trimmed === (value ?? '').trim()) { if (trimmed !== draft) setDraft(trimmed); return }
    const savedVal = trimmed.length > 0 ? trimmed : null
    await notesSave.run(async () => {
      const res = await fetch(`/api/leads/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: draft }),
      })
      if (!res.ok) throw new Error('save failed')
      onSaved(savedVal)
      setDraft(savedVal ?? '')
    })
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Notiz</p>
        <SaveStatus status={notesSave.status} />
      </div>
      <textarea
        ref={taRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        placeholder="Interne Notiz zu diesem Lead… (z. B. Rückruf vereinbart, kein Interesse)"
        rows={2}
        className="w-full resize-none overflow-hidden rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-300 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-600"
      />
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
  // Lesbare Labels fuer die abgeleiteten Kontakt-Keys (deriveContactFromAnswers)
  const CONTACT_KEY_LABEL: Record<string, string> = {
    plz: 'PLZ',
    firstName: 'Vorname',
    lastName: 'Nachname',
  }

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
                <p className="text-xs text-gray-400 dark:text-gray-500">{CONTACT_KEY_LABEL[key] ?? key}</p>
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
      className="fixed inset-0 z-50 flex overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <div
        className="m-auto w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
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
      <p className="truncate text-xs text-gray-400">{s.contact_email ?? s.contact_phone ?? "Keine Kontaktdaten"}</p>
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
        isDragging ? 'opacity-40' : 'hover:border-primary/40 hover:bg-gray-50 hover:shadow dark:hover:bg-gray-800'
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
        className={`flex max-h-[68vh] min-h-32 flex-1 flex-col gap-2 overflow-y-auto rounded-xl border-2 border-dashed p-2 transition-colors ${
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

// ─── CSV-Format-Auswahl (Aufgabe 69) ──────────────────────────────────────────
// „CSV" ist kein einheitlicher Standard — der Nutzer wählt beim Export den Dialekt.
const EXPORT_FORMATS: Array<{ key: 'excel' | 'standard'; label: string; hint: string }> = [
  { key: 'excel', label: 'Excel (Deutschland)', hint: 'Semikolon-getrennt — öffnet per Doppelklick in deutschem Excel.' },
  { key: 'standard', label: 'Standard (Komma)', hint: 'Komma-getrennt (RFC 4180) — für andere Tools & Google Sheets.' },
]

function ExportFormatModal({
  count,
  onExport,
  onClose,
}: {
  count: number
  onExport: (dialect: CsvDialect) => void
  onClose: () => void
}) {
  const [format, setFormat] = useState<'excel' | 'standard'>('excel')

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm dark:bg-black/40"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="CSV-Format wählen"
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">CSV-Format wählen</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="rounded p-1 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2">
          {EXPORT_FORMATS.map((opt) => {
            const active = format === opt.key
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setFormat(opt.key)}
                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                  active
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                }`}
              >
                <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${active ? 'border-primary' : 'border-gray-300 dark:border-gray-600'}`}>
                  {active && <span className="h-2 w-2 rounded-full bg-primary" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-900 dark:text-white">{opt.label}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{opt.hint}</span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={() => onExport(format === 'excel' ? CSV_EXCEL : CSV_STANDARD)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <Download size={15} />
            {count} exportieren
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TenantLeadsTable({
  submissions,
  funnels,
  initialStatus = 'alle',
}: {
  submissions: TenantSubmission[]
  funnels: FunnelOption[]
  initialStatus?: 'alle' | LeadStatus
}) {
  const [rows, setRows]             = useState<TenantSubmission[]>(submissions)
  const [view, setView]             = useState<'list' | 'board'>('list')
  const [openId, setOpenId]         = useState<string | null>(null)
  const [detailId, setDetailId]     = useState<string | null>(null)
  const [query, setQuery]           = useState('')
  const [funnelFilter, setFunnelFilter] = useState('alle')
  const [dateRange, setDateRange]   = useState('all')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')
  const [sortBy, setSortBy]         = useState('date_desc')
  const [statusTab, setStatusTab]   = useState<'alle' | LeadStatus>(initialStatus)
  const [visibleCount, setVisibleCount] = useState(25)
  const [activeId, setActiveId]     = useState<string | null>(null)
  const [exportModalOpen, setExportModalOpen] = useState(false)
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

  // Zeitraum-Preset → konkrete Von/Bis-Grenzen (ms). 'custom' nutzt die Datumsfelder.
  const dateBounds = useMemo(() => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    let from: number | null = null
    let to: number | null = null
    switch (dateRange) {
      case 'today': from = startOfToday; break
      case '7d':    from = startOfToday - 6 * 86400000; break
      case '30d':   from = startOfToday - 29 * 86400000; break
      case 'month': from = new Date(now.getFullYear(), now.getMonth(), 1).getTime(); break
      case 'custom':
        if (dateFrom) { const f = new Date(dateFrom); f.setHours(0, 0, 0, 0); from = f.getTime() }
        if (dateTo)   { const t = new Date(dateTo);   t.setHours(23, 59, 59, 999); to = t.getTime() }
        break
    }
    return { from, to }
  }, [dateRange, dateFrom, dateTo])

  // Gemeinsame Filter (ohne Status, ohne Sort) — Basis für Liste + Board.
  const baseFiltered = useMemo(() => {
    const q = query.toLowerCase()
    return rows.filter((s) => {
      if (q && !(s.contact_name ?? '').toLowerCase().includes(q) &&
               !(s.contact_email ?? '').toLowerCase().includes(q) &&
               !(s.contact_phone ?? '').toLowerCase().includes(q)) return false
      if (funnelFilter !== 'alle' && s.funnel_slug !== funnelFilter) return false
      const ts = new Date(s.created_at).getTime()
      if (dateBounds.from !== null && ts < dateBounds.from) return false
      if (dateBounds.to !== null && ts > dateBounds.to) return false
      return true
    })
  }, [rows, query, funnelFilter, dateBounds])

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

  // Render-Limit zurücksetzen, wenn sich die sichtbare Liste durch Filter/Tab/Sort ändert.
  useEffect(() => { setVisibleCount(25) }, [statusTab, query, funnelFilter, dateRange, dateFrom, dateTo, sortBy])

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

  const hasActiveFilters = query || funnelFilter !== 'alle' || dateRange !== 'all'
  const showFunnel = funnels.length > 1
  const activeLead = activeId ? rows.find((r) => r.id === activeId) ?? null : null
  const detailLead = detailId ? rows.find((r) => r.id === detailId) ?? null : null

  // ─── CSV-Export (Aufgabe 69) ───────────────────────────────────────────────
  // Bewusst pro Funnel (verschiedene Funnels = verschiedene Spalten) und bewusst OHNE
  // Einzelauswahl: exportiert wird immer die aktuell gefilterte Liste — die Filter
  // (Funnel · Status · Zeitraum · Suche) sind die „Auswahl". Einzel-Funnel-Kontext =
  // ein Funnel im Filter gewählt ODER das Konto hat nur einen.
  const singleFunnelContext = funnelFilter !== 'alle' || funnels.length === 1
  const exportFunnelSlug = funnelFilter !== 'alle' ? funnelFilter : (funnels[0]?.slug ?? 'leads')
  const exportDisabled = !singleFunnelContext || listRows.length === 0

  // Der eigentliche Download — Format (Dialekt) kommt aus dem Auswahl-Modal.
  function handleExport(dialect: CsvDialect) {
    if (exportDisabled) return
    const today = new Date().toISOString().slice(0, 10)
    downloadCsv(`leads_${exportFunnelSlug}_${today}.csv`, toCsv(buildLeadsMatrix(listRows), dialect))
    setExportModalOpen(false)
  }

  const exportButton = (
    // group/relative: trägt den eigenen Hover-Tooltip (statt nativem title — sofort + im App-Stil).
    <span className="group relative inline-block">
      <button
        type="button"
        onClick={() => setExportModalOpen(true)}
        disabled={exportDisabled}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-gray-300 disabled:hover:text-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:border-primary dark:hover:text-primary dark:disabled:hover:border-gray-600 dark:disabled:hover:text-gray-200"
      >
        <Download size={15} />
        Exportieren ({listRows.length})
      </button>
      {!singleFunnelContext && (
        <span className="pointer-events-none absolute right-0 top-full z-30 mt-1.5 hidden whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg group-hover:block dark:bg-gray-700">
          Zum Export zuerst einen Funnel wählen
        </span>
      )}
    </span>
  )

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

  // Aufgabe 59 (Stavros-Review): `compact` + `trailing` für die Board-Ansicht — dort gibt es
  // keine Status-Tabs, also wird ALLES eine Zeile: kompakte Suche + Filter links, View-Umschalter
  // rechts. Die Liste behält ihre vollbreite Suche unter der Tab-Zeile (abgenommen).
  function renderToolbar({ showSort, compact = false, trailing }: { showSort: boolean; compact?: boolean; trailing?: ReactNode }) {
    return (
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className={compact ? 'relative w-full sm:w-72' : 'relative w-full sm:w-64'}>
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
          <Select value={funnelFilter} onChange={setFunnelFilter} options={funnelOptions} className="sm:w-52" />
        )}
        <Select
          value={dateRange}
          onChange={setDateRange}
          options={[
            { value: 'all',    label: 'Jederzeit' },
            { value: 'today',  label: 'Heute' },
            { value: '7d',     label: 'Letzte 7 Tage' },
            { value: '30d',    label: 'Letzte 30 Tage' },
            { value: 'month',  label: 'Dieser Monat' },
            { value: 'custom', label: 'Benutzerdefiniert…' },
          ]}
          className="sm:w-44"
        />
        {showSort && (
          <Select
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: 'date_desc', label: 'Neueste zuerst' },
              { value: 'date_asc',  label: 'Älteste zuerst' },
              { value: 'status',    label: 'Status (Neu → Erledigt)' },
            ]}
            className="sm:w-44"
          />
        )}
        {hasActiveFilters && (
          <button
            onClick={() => { setQuery(''); setFunnelFilter('alle'); setDateRange('all'); setDateFrom(''); setDateTo('') }}
            className="shrink-0 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 transition hover:border-gray-300 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200"
          >
            Zurücksetzen
          </button>
        )}
        {trailing && <div className="sm:ml-auto">{trailing}</div>}
      </div>
    )
  }

  function renderCustomDates() {
    if (dateRange !== 'custom') return null
    return (
      <div className="mb-4 -mt-2 flex items-center gap-2">
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
      </div>
    )
  }

  return (
    <div>
      {/* Kopfzeile: Status-Tabs + View-Umschalter — nur in der Liste. Das Board hat keine
          Tabs (die Spalten SIND der Status) und packt den Umschalter in seine Toolbar-Zeile
          (Aufgabe 59 — vorher: fast leere Zeile + vollbreite Solo-Suche). */}
      {view === 'list' && (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-1">
          {TABS.map((t) => {
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
      )}

      {view === 'board' ? (
        /* ─── Board-Ansicht ─── */
        <div>
          {renderToolbar({ showSort: false, compact: true, trailing: renderViewToggle() })}
          {renderCustomDates()}
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
              {/* mt-6: klare Trennung zwischen Filter-Zeile und Board (Stavros-Review, Runde 2) */}
              <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
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
          {renderToolbar({ showSort: true, trailing: exportButton })}
          {renderCustomDates()}

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
              {listRows.slice(0, visibleCount).map((s) => {
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
                        <p className="truncate text-xs text-gray-400">{s.contact_email ?? s.contact_phone ?? "Keine Kontaktdaten"}</p>
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
              {listRows.length > visibleCount && (
                <button
                  onClick={() => setVisibleCount((c) => c + 25)}
                  className="block w-full border-t border-gray-100 bg-gray-50 px-5 py-3 text-center text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Mehr laden ({listRows.length - visibleCount} weitere)
                </button>
              )}
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

      {/* CSV-Format-Auswahl vor dem Download */}
      {exportModalOpen && (
        <ExportFormatModal
          count={listRows.length}
          onExport={handleExport}
          onClose={() => setExportModalOpen(false)}
        />
      )}
    </div>
  )
}

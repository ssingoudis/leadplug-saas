'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Power, Trash2, TriangleAlert, Loader2 } from 'lucide-react'

// Gefahrenzone in der Workspace-Einsicht: Deaktivieren/Reaktivieren + Löschen,
// beide mit Popup-Warnung. Löschen verlangt zusätzlich das Tippen des Namens.

export default function WorkspaceDangerZone({ tenantId, companyName, isActive, funnelCount, leadCount }: {
  tenantId: string
  companyName: string
  isActive: boolean
  funnelCount: number
  leadCount: number
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [showToggle, setShowToggle] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  async function toggleActive() {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/workspaces/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      })
      if (!res.ok) throw new Error()
      setShowToggle(false)
      router.refresh()
    } catch {
      alert('Aktion fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }

  async function del() {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/workspaces/${tenantId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      router.push('/admin')
    } catch {
      alert('Löschen fehlgeschlagen.')
      setBusy(false)
    }
  }

  const rowBox = 'flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900'

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/40 p-5 dark:border-red-900/40 dark:bg-red-900/10">
      <h2 className="text-sm font-bold text-red-700 dark:text-red-400">Gefahrenzone</h2>
      <div className="mt-3 flex flex-col gap-3">
        <div className={rowBox}>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{isActive ? 'Workspace deaktivieren' : 'Workspace reaktivieren'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isActive ? 'Alle Funnels gehen offline — eingebettete iFrames zeigen nichts mehr.' : 'Funnels gehen wieder online.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowToggle(true)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <Power size={14} /> {isActive ? 'Deaktivieren' : 'Reaktivieren'}
          </button>
        </div>

        <div className={rowBox}>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Workspace löschen</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Entfernt Workspace, Funnels & Leads unwiderruflich.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowDelete(true)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-40"
          >
            <Trash2 size={14} /> Löschen
          </button>
        </div>
      </div>

      {showToggle && (
        <ConfirmModal
          title={isActive ? 'Workspace deaktivieren?' : 'Workspace reaktivieren?'}
          message={isActive
            ? 'Alle Funnels dieses Workspaces gehen offline. Eingebettete iFrames auf Kundenseiten zeigen dann nichts mehr. Lässt sich jederzeit rückgängig machen.'
            : 'Die Funnels dieses Workspaces gehen wieder online.'}
          confirmLabel={isActive ? 'Deaktivieren' : 'Reaktivieren'}
          danger={isActive}
          busy={busy}
          onClose={() => !busy && setShowToggle(false)}
          onConfirm={toggleActive}
        />
      )}

      {showDelete && (
        <TypeNameModal
          name={companyName}
          funnelCount={funnelCount}
          leadCount={leadCount}
          busy={busy}
          onClose={() => !busy && setShowDelete(false)}
          onConfirm={del}
        />
      )}
    </div>
  )
}

// ── Modale ───────────────────────────────────────────────────────────────────

// Aufgabe 59: exportiert — WorkspacesCockpit nutzt dasselbe Modal statt window.confirm
// (native Browser-Dialoge sind im Rest der App längst durch gestylte Modals ersetzt).
export function ConfirmModal({ title, message, confirmLabel, danger, busy, onClose, onConfirm }: {
  title: string; message: string; confirmLabel: string; danger: boolean; busy: boolean; onClose: () => void; onConfirm: () => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && !busy) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, busy])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => !busy && onClose()}>
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${danger ? 'bg-red-50 dark:bg-red-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
            <TriangleAlert size={18} className={danger ? 'text-red-500' : 'text-amber-500'} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{message}</p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">Abbrechen</button>
          <button type="button" onClick={onConfirm} disabled={busy} className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-40 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary-hover'}`}>
            {busy ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function TypeNameModal({ name, funnelCount, leadCount, busy, onClose, onConfirm }: {
  name: string; funnelCount: number; leadCount: number; busy: boolean; onClose: () => void; onConfirm: () => void
}) {
  const [text, setText] = useState('')
  const match = name.length > 0 && text.trim() === name

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && !busy) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, busy])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => !busy && onClose()}>
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="mb-4 flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
              <TriangleAlert size={18} className="text-red-500" />
            </div>
            <div className="min-w-0">
              <h3 className="mb-1 text-sm font-bold text-gray-900 dark:text-white">Workspace unwiderruflich löschen?</h3>
              <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-gray-700 dark:text-gray-300">{name}</span> wird dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
            </div>
          </div>

          <div className="mb-5 space-y-1 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 dark:border-red-700/40 dark:bg-red-900/10 dark:text-red-400">
            <p>— {funnelCount} Funnel(s) inkl. aller Fragen & Einstellungen werden gelöscht</p>
            <p>— {leadCount} eingegangene Lead(s) werden gelöscht</p>
            <p>— Wiederherstellung nur über ein Backup möglich</p>
          </div>

          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
            Tippe zur Bestätigung den Namen{' '}
            <span className="rounded bg-gray-100 px-1 py-0.5 font-mono text-gray-900 dark:bg-gray-800 dark:text-white">{name}</span>
          </label>
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={name}
            className="mb-5 mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!match || busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <><Loader2 size={14} className="animate-spin" /> Löscht…</> : 'Dauerhaft löschen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

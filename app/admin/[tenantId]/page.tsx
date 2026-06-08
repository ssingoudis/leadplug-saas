import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { getWorkspaceDetail } from '@/lib/admin/queries'
import Card from '@/components/ui/Card'
import StatTile from '@/components/ui/StatTile'
import Badge from '@/components/ui/Badge'
import WorkspaceDangerZone from '@/components/admin/WorkspaceDangerZone'

type Variant = 'amber' | 'purple' | 'green' | 'gray'
const STATUS: Record<string, { label: string; variant: Variant }> = {
  offen:         { label: 'Neu', variant: 'amber' },
  kontaktiert:   { label: 'Kontaktiert', variant: 'purple' },
  abgeschlossen: { label: 'Erledigt', variant: 'green' },
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default async function AdminWorkspaceDetailPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params
  const detail = await getWorkspaceDetail(tenantId)
  if (!detail) notFound()

  const { tenant, owner, funnels, leads, totals } = detail

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> Alle Workspaces
      </Link>

      {/* Tenant-Header */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">{tenant.companyName || '—'}</h1>
            <p className="mt-0.5 text-sm text-gray-400 dark:text-gray-500">
              {owner?.email ?? <span className="italic">kein Owner</span>}
              {' · angelegt '}{new Date(tenant.createdAt).toLocaleDateString('de-DE')}
            </p>
          </div>
          <Badge variant={tenant.billingModel === 'free' ? 'purple' : 'green'}>{tenant.billingModel ?? '—'}</Badge>
        </div>
      </Card>

      {/* Stat-Kacheln */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile value={totals.funnels} label="Funnels" />
        <StatTile value={totals.leads} label="Leads" />
        <StatTile value={totals.views} label="Aufrufe" />
        <StatTile value={`${totals.conversion} %`} label="Conversion" />
      </div>

      {/* Funnels */}
      <Card title="Funnels">
        {funnels.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">Keine Funnels.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {funnels.map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3 dark:border-gray-800">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{f.name}</p>
                  <p className="truncate font-mono text-xs text-gray-400 dark:text-gray-500">/{f.slug}</p>
                </div>
                <Badge variant={f.isActive ? 'green' : 'gray'}>{f.isActive ? 'Aktiv' : 'Inaktiv'}</Badge>
                <span className="w-16 text-right text-sm text-gray-600 dark:text-gray-300">{f.viewCount} <span className="text-gray-400">Aufr.</span></span>
                <span className="w-16 text-right text-sm font-semibold text-gray-900 dark:text-white">{f.leadCount} <span className="font-normal text-gray-400">Leads</span></span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Leads (read-only, native details für Antworten) */}
      <Card title={`Leads (${leads.length})`}>
        {leads.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">Keine Leads.</p>
        ) : (
          <div className="-mx-6 -mb-6 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
            {leads.map((l, idx) => {
              const st = STATUS[l.status] ?? { label: l.status, variant: 'gray' as Variant }
              const extraContact = Object.entries(l.contact ?? {}).filter(([k]) => !['anrede', 'name', 'email', 'telefon'].includes(k))
              return (
                <details key={l.id} className={`group bg-white dark:bg-gray-900 ${idx < leads.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''}`}>
                  <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="w-28 shrink-0 text-xs text-gray-400">{fmtDateTime(l.createdAt)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{[l.anrede, l.name].filter(Boolean).join(' ') || '—'}</p>
                      <p className="truncate text-xs text-gray-400">{l.email || l.phone}</p>
                    </div>
                    <Badge variant={st.variant}>{st.label}</Badge>
                    <ChevronDown size={16} className="shrink-0 text-gray-300 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="grid grid-cols-1 gap-6 border-t border-gray-100 bg-gray-50/60 px-5 py-5 dark:border-gray-800 dark:bg-gray-800/40 sm:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Kontakt</p>
                      <div className="space-y-1.5 text-sm">
                        {l.anrede && <p><span className="text-gray-400">Anrede:</span> {l.anrede}</p>}
                        {l.name && <p><span className="text-gray-400">Name:</span> {l.name}</p>}
                        {l.email && <p><span className="text-gray-400">E-Mail:</span> {l.email}</p>}
                        {l.phone && <p><span className="text-gray-400">Telefon:</span> {l.phone}</p>}
                        {extraContact.map(([k, v]) => v ? <p key={k}><span className="text-gray-400">{k}:</span> {v}</p> : null)}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Antworten</p>
                      {Object.keys(l.answers ?? {}).length === 0 ? (
                        <p className="text-sm text-gray-400 dark:text-gray-500">Keine Antworten.</p>
                      ) : (
                        <div className="space-y-1.5 text-sm">
                          {Object.entries(l.answers ?? {}).map(([k, v]) => (
                            <p key={k}><span className="text-gray-400">{k}:</span> {v}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </details>
              )
            })}
          </div>
        )}
      </Card>

      {/* Gefahrenzone — Deaktivieren + Löschen (mit Popup-Warnungen) */}
      <WorkspaceDangerZone
        tenantId={tenant.id}
        companyName={tenant.companyName ?? ''}
        isActive={tenant.isActive}
        funnelCount={totals.funnels}
        leadCount={totals.leads}
      />
    </div>
  )
}

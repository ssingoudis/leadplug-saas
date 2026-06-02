import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getWorkspaces } from '@/lib/admin/queries'
import Card from '@/components/ui/Card'
import StatTile from '@/components/ui/StatTile'
import Badge from '@/components/ui/Badge'

function fmtRelative(iso: string | null): string {
  if (!iso) return '—'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'heute'
  if (days === 1) return 'gestern'
  if (days < 30) return `vor ${days} Tagen`
  const months = Math.floor(days / 30)
  if (months < 12) return `vor ${months} Mon.`
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default async function AdminWorkspacesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const myEmail = (user?.email ?? '').toLowerCase()

  const workspaces = await getWorkspaces()
  const totals = {
    workspaces: workspaces.length,
    funnels: workspaces.reduce((s, w) => s + w.funnelCount, 0),
    leads: workspaces.reduce((s, w) => s + w.leadCount, 0),
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-4">
        <StatTile value={totals.workspaces} label="Workspaces" />
        <StatTile value={totals.funnels} label="Funnels gesamt" />
        <StatTile value={totals.leads} label="Leads gesamt" />
      </div>

      <Card title="Workspaces">
        <div className="-mx-2 overflow-x-auto">
          <div className="min-w-[760px] px-2">
            {/* Kopfzeile */}
            <div className="flex items-center gap-3 border-b border-gray-100 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-800 dark:text-gray-500">
              <span className="flex-1">Workspace</span>
              <span className="w-56">Owner</span>
              <span className="w-16 text-right">Funnels</span>
              <span className="w-14 text-right">Leads</span>
              <span className="w-28 text-right">Zuletzt aktiv</span>
              <span className="w-20 text-center">Billing</span>
            </div>

            {workspaces.map((w) => {
              const isMe = !!w.ownerEmail && w.ownerEmail.toLowerCase() === myEmail
              return (
                <Link
                  key={w.tenantId}
                  href={`/admin/${w.tenantId}`}
                  className="flex items-center gap-3 border-b border-gray-50 px-3 py-3 transition-colors hover:bg-gray-50 dark:border-gray-800/60 dark:hover:bg-gray-800"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 truncate text-sm font-medium text-gray-900 dark:text-white">
                      <span className="truncate">{w.companyName || '—'}</span>
                      {isMe && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">du</span>}
                    </span>
                  </span>
                  <span className="w-56 truncate text-sm text-gray-600 dark:text-gray-300">
                    {w.ownerEmail ?? <span className="italic text-gray-400 dark:text-gray-500">kein Owner</span>}
                  </span>
                  <span className="w-16 text-right text-sm text-gray-600 dark:text-gray-300">{w.funnelCount}</span>
                  <span className="w-14 text-right text-sm font-semibold text-gray-900 dark:text-white">{w.leadCount}</span>
                  <span className="w-28 text-right text-sm text-gray-500 dark:text-gray-400">{fmtRelative(w.lastSignInAt)}</span>
                  <span className="w-20 text-center">
                    <Badge variant={w.billingModel === 'free' ? 'purple' : 'green'}>{w.billingModel ?? '—'}</Badge>
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </Card>
    </div>
  )
}

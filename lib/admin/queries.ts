import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isSuperadmin } from '@/lib/auth/superadmin'

// Cross-Tenant Reads für das Admin-Cockpit. AUSSCHLIESSLICH server-seitig. Service-Key
// bypasst RLS — daher hier keine Tenant-Scoping-Annahmen, sondern bewusste plattformweite
// Sicht. Aufgabe 60: Superadmin-Gate zusätzlich IN den Queries (Defense-in-Depth) — das
// Layout-Gate (app/dashboard/admin/layout.tsx) bleibt die UX-Schicht (404), aber Next
// rendert Layout und Page parallel; die Queries verteidigen sich seither selbst und
// können nirgendwo versehentlich ungegated aufgerufen werden.
//
// Bewusst JS-Assembly statt SQL-RPC: keine Migration, auth.users via auth.admin-API.
// Datenmengen sind klein; bei Wachstum auf paginierte/aggregierte Queries umstellen.

async function assertSuperadmin(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isSuperadmin(user?.email)) {
    throw new Error('[admin/queries] Zugriff ohne Superadmin-Gate blockiert')
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export type WorkspaceRow = {
  tenantId: string
  companyName: string | null
  ownerEmail: string | null
  ownerUserId: string | null
  lastSignInAt: string | null
  funnelCount: number
  activeFunnelCount: number
  leadCount: number
  viewCount: number
  lastLeadAt: string | null
  billingModel: string | null
  isActive: boolean
  createdAt: string
}

export async function getWorkspaces(): Promise<WorkspaceRow[]> {
  await assertSuperadmin()
  const admin = createAdminClient()

  const [tenantsRes, membersRes, funnelsRes, subsRes, viewsRes, usersRes] = await Promise.all([
    admin.from('tenants').select('id, company_name, billing_model, is_active, created_at'),
    admin.from('tenant_members').select('tenant_id, auth_user_id, role').eq('role', 'owner'),
    admin.from('funnels').select('id, tenant_id, is_active'),
    admin.from('submissions').select('tenant_id, completed_at, created_at'),
    admin.from('funnel_view_logs').select('tenant_id'),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  const tenants = (tenantsRes.data ?? []) as any[]
  const members = (membersRes.data ?? []) as any[]
  const funnels = (funnelsRes.data ?? []) as any[]
  const subs    = (subsRes.data ?? []) as any[]
  const views   = (viewsRes.data ?? []) as any[]
  const users   = usersRes.data?.users ?? []

  const userById = new Map<string, { email: string | null; lastSignInAt: string | null }>()
  for (const u of users) userById.set(u.id, { email: u.email ?? null, lastSignInAt: u.last_sign_in_at ?? null })

  const ownerByTenant = new Map<string, string>()
  for (const m of members) if (!ownerByTenant.has(m.tenant_id)) ownerByTenant.set(m.tenant_id, m.auth_user_id)

  const funnelCount = new Map<string, number>()
  const activeFunnelCount = new Map<string, number>()
  for (const f of funnels) {
    if (!f.tenant_id) continue
    funnelCount.set(f.tenant_id, (funnelCount.get(f.tenant_id) ?? 0) + 1)
    if (f.is_active) activeFunnelCount.set(f.tenant_id, (activeFunnelCount.get(f.tenant_id) ?? 0) + 1)
  }

  const leadCount = new Map<string, number>()
  const lastLeadAt = new Map<string, string>()
  for (const s of subs) {
    if (!s.tenant_id || !s.completed_at) continue
    leadCount.set(s.tenant_id, (leadCount.get(s.tenant_id) ?? 0) + 1)
    const prev = lastLeadAt.get(s.tenant_id)
    if (!prev || new Date(s.created_at) > new Date(prev)) lastLeadAt.set(s.tenant_id, s.created_at as string)
  }

  const viewCount = new Map<string, number>()
  for (const v of views) if (v.tenant_id) viewCount.set(v.tenant_id, (viewCount.get(v.tenant_id) ?? 0) + 1)

  return tenants
    .map((t) => {
      const ownerId = ownerByTenant.get(t.id) ?? null
      const owner = ownerId ? userById.get(ownerId) : null
      return {
        tenantId: t.id as string,
        companyName: (t.company_name as string | null) ?? null,
        ownerEmail: owner?.email ?? null,
        ownerUserId: ownerId,
        lastSignInAt: owner?.lastSignInAt ?? null,
        funnelCount: funnelCount.get(t.id) ?? 0,
        activeFunnelCount: activeFunnelCount.get(t.id) ?? 0,
        leadCount: leadCount.get(t.id) ?? 0,
        viewCount: viewCount.get(t.id) ?? 0,
        lastLeadAt: lastLeadAt.get(t.id) ?? null,
        billingModel: (t.billing_model as string | null) ?? null,
        isActive: (t.is_active as boolean) ?? true,
        createdAt: t.created_at as string,
      }
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export type AdminLead = {
  id: string
  createdAt: string
  completedAt: string | null
  status: string
  anrede: string
  name: string
  email: string
  phone: string
  contact: Record<string, string> | null
  answers: Record<string, string> | null
  funnelSlug: string
}

export type WorkspaceDetail = {
  tenant: { id: string; companyName: string | null; billingModel: string | null; isActive: boolean; createdAt: string }
  owner: { email: string | null; lastSignInAt: string | null } | null
  funnels: { id: string; slug: string; name: string; isActive: boolean; leadCount: number; viewCount: number }[]
  leads: AdminLead[]
  totals: { funnels: number; leads: number; views: number; conversion: number }
}

export async function getWorkspaceDetail(tenantId: string): Promise<WorkspaceDetail | null> {
  await assertSuperadmin()
  const admin = createAdminClient()

  const { data: tenant } = await admin
    .from('tenants')
    .select('id, company_name, billing_model, is_active, created_at')
    .eq('id', tenantId)
    .maybeSingle()
  if (!tenant) return null

  const [membersRes, funnelsRes, subsRes, viewsRes] = await Promise.all([
    admin.from('tenant_members').select('auth_user_id').eq('tenant_id', tenantId).eq('role', 'owner'),
    admin.from('funnels').select('id, slug, funnel_name, is_active').eq('tenant_id', tenantId),
    admin.from('submissions')
      .select('id, created_at, completed_at, status, contact, answers, funnel_slug')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false }),
    admin.from('funnel_view_logs').select('funnel_id').eq('tenant_id', tenantId),
  ])

  const ownerId = (membersRes.data as any[] | null)?.[0]?.auth_user_id ?? null
  let owner: { email: string | null; lastSignInAt: string | null } | null = null
  if (ownerId) {
    const { data: u } = await admin.auth.admin.getUserById(ownerId)
    owner = { email: u.user?.email ?? null, lastSignInAt: u.user?.last_sign_in_at ?? null }
  }

  const funnels = (funnelsRes.data ?? []) as any[]
  const subs    = (subsRes.data ?? []) as any[]
  const views   = (viewsRes.data ?? []) as any[]

  const viewByFunnelId = new Map<string, number>()
  for (const v of views) if (v.funnel_id) viewByFunnelId.set(v.funnel_id, (viewByFunnelId.get(v.funnel_id) ?? 0) + 1)

  const leadBySlug = new Map<string, number>()
  for (const s of subs) if (s.funnel_slug && s.completed_at) leadBySlug.set(s.funnel_slug, (leadBySlug.get(s.funnel_slug) ?? 0) + 1)

  const funnelRows = funnels.map((f) => ({
    id: f.id as string,
    slug: f.slug as string,
    name: (f.funnel_name as string | null) ?? (f.slug as string),
    isActive: (f.is_active as boolean) ?? true,
    leadCount: leadBySlug.get(f.slug) ?? 0,
    viewCount: viewByFunnelId.get(f.id) ?? 0,
  }))

  const leads: AdminLead[] = subs
    .map((s) => {
      const c = (s.contact ?? {}) as Record<string, string>
      const email = (c.email ?? '').trim()
      const phone = (c.telefon ?? '').trim()
      return {
        id: s.id as string,
        createdAt: s.created_at as string,
        completedAt: (s.completed_at as string | null) ?? null,
        status: (s.status as string) ?? 'offen',
        anrede: (c.anrede ?? '').trim(),
        name: (c.name ?? '').trim(),
        email,
        phone,
        contact: (s.contact as Record<string, string> | null) ?? null,
        answers: (s.answers as Record<string, string> | null) ?? null,
        funnelSlug: s.funnel_slug as string,
      }
    })
    .filter((l) => l.email || l.phone)

  const totalViews = views.length
  const totalLeads = leads.length
  const completedCount = subs.filter((s) => s.completed_at).length
  const conversion = totalViews > 0 ? Math.round((completedCount / totalViews) * 100) : 0

  return {
    tenant: {
      id: tenant.id as string,
      companyName: (tenant.company_name as string | null) ?? null,
      billingModel: (tenant.billing_model as string | null) ?? null,
      isActive: (tenant.is_active as boolean) ?? true,
      createdAt: tenant.created_at as string,
    },
    owner,
    funnels: funnelRows,
    leads,
    totals: { funnels: funnelRows.length, leads: totalLeads, views: totalViews, conversion },
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Aufgabe 41 — Lead-Vorschau-Datenquelle für den E-Mails-Editor.
//
// Liefert die letzten N (default 5) completed Submissions des Funnels in
// kompakter Form. Wird im EmailsPanel-Vorschau-Dropdown verwendet, damit der
// Tenant seine Mail mit echten Lead-Daten preview kann statt nur Mock.
//
// Nur completed Submissions — Abbrecher haben oft unvollständige Daten und
// machen die Vorschau weniger aussagekräftig.
// =============================================================================

export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const url = new URL(req.url)
  const limit = Math.min(20, Math.max(1, Number(url.searchParams.get('limit') ?? '5')))

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Funnel-Zugehörigkeit checken (RLS macht das auf submissions-Seite ebenfalls,
  // aber explizit ist klarer + erlaubt 404-Response)
  const { data: funnel } = await supabase
    .from('funnels')
    .select('id, slug')
    .eq('slug', slug)
    .maybeSingle()
  if (!funnel) return NextResponse.json({ error: 'Funnel not found' }, { status: 404 })

  const { data: submissions, error } = await supabase
    .from('submissions')
    .select('id, created_at, completed_at, contact, answers')
    .eq('funnel_slug', slug)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Kompakte Repräsentation für den Picker
  const rows = (submissions ?? []).map((s) => {
    const contact = (s.contact as Record<string, string> | null) ?? {}
    return {
      id:           s.id,
      created_at:   s.created_at,
      completed_at: s.completed_at,
      contact,
      answers:      (s.answers as Record<string, string> | null) ?? {},
      // Label für den Picker: "Max Mustermann — vor 2 Std" o.ä. baut das Frontend
      display_name: contact.name || contact.email || 'Unbekannt',
    }
  })

  return NextResponse.json(rows)
}

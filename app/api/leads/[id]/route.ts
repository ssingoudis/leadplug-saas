import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_STATUSES = ['offen', 'kontaktiert', 'abgeschlossen'] as const

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.status || !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // RLS sorgt dafuer, dass nur eigene submissions getroffen werden.
  const { error, count } = await supabase
    .from('submissions')
    .update({ status: body.status }, { count: 'exact' })
    .eq('id', id)

  if (error) {
    console.error('[leads PATCH]', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
  if (count === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}

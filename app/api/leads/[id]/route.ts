import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_STATUSES = ['offen', 'kontaktiert', 'abgeschlossen'] as const
const NOTES_MAX_LENGTH = 5000

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Aufgabe 46: PATCH akzeptiert status und/oder notes. Nur die mitgeschickten
  // Felder werden geschrieben — mindestens eins muss dabei sein.
  const update: { status?: string; notes?: string | null } = {}

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    update.status = body.status
  }

  if (body.notes !== undefined) {
    if (typeof body.notes !== 'string') {
      return NextResponse.json({ error: 'Invalid notes' }, { status: 400 })
    }
    const trimmed = body.notes.trim()
    if (trimmed.length > NOTES_MAX_LENGTH) {
      return NextResponse.json({ error: 'Notes too long' }, { status: 400 })
    }
    // Leere Notiz wird zu NULL (kein leerer String in der DB).
    update.notes = trimmed.length > 0 ? trimmed : null
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  // RLS sorgt dafuer, dass nur eigene submissions getroffen werden.
  const { error, count } = await supabase
    .from('submissions')
    .update(update, { count: 'exact' })
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

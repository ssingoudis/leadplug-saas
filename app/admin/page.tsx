import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isSuperadmin } from '@/lib/auth/superadmin'

// Aufgabe 60: Der Admin-Bereich lebt jetzt unter /dashboard/admin (im DashboardShell).
// Diese Route fängt die alte URL ab (Bookmarks/Verlauf). Gleiches Gate wie vorher:
// Nicht-Admins sehen 404, die Existenz des Bereichs bleibt verborgen.
export default async function AdminRedirect() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isSuperadmin(user?.email)) notFound()
  redirect('/dashboard/admin')
}

import { createClient } from '@/lib/supabase/server'
import { getWorkspaces } from '@/lib/admin/queries'
import WorkspacesCockpit from '@/components/admin/WorkspacesCockpit'

export default async function AdminWorkspacesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const myEmail = (user?.email ?? '').toLowerCase()

  const workspaces = await getWorkspaces()

  return <WorkspacesCockpit workspaces={workspaces} myEmail={myEmail} />
}

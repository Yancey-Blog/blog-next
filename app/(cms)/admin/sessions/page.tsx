import { SessionManagement } from '@/components/session-management'
import { isSuperAdmin } from '@/lib/auth-utils'
import { requireAuth } from '@/lib/session'
import { redirect } from 'next/navigation'

export default async function SessionsPage() {
  const session = await requireAuth()

  // Only super admins can access session management
  if (!isSuperAdmin(session.user)) {
    redirect('/admin')
  }

  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Session Management
        </h1>
        <p className="text-muted-foreground mt-2">
          View and manage active user sessions
        </p>
      </div>

      <SessionManagement />
    </div>
  )
}

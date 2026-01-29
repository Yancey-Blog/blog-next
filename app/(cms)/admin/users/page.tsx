import { UserManagement } from '@/components/user-management'
import { isSuperAdmin } from '@/lib/auth-utils'
import { getSessionUser, requireAuth } from '@/lib/session'
import { redirect } from 'next/navigation'

export default async function UsersPage() {
  const session = await requireAuth()
  const user = getSessionUser(session)

  // Only super admins can access user management
  if (!isSuperAdmin(user)) {
    redirect('/admin')
  }

  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage user roles and permissions
        </p>
      </div>

      <UserManagement />
    </div>
  )
}

import { isSuperAdmin } from '@/lib/auth-utils'
import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { getSessionUser, requireAuth } from '@/lib/session'
import { desc } from 'drizzle-orm'
import { NextResponse } from 'next/server'

// GET /api/admin/users - Get all users
export async function GET() {
  try {
    const session = await requireAuth()
    const user = getSessionUser(session)

    // Only super admins can view users
    if (!isSuperAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const users = await db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        emailVerified: schema.users.emailVerified,
        image: schema.users.image,
        role: schema.users.role,
        createdAt: schema.users.createdAt,
        updatedAt: schema.users.updatedAt
      })
      .from(schema.users)
      .orderBy(desc(schema.users.createdAt))

    return NextResponse.json(users)
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

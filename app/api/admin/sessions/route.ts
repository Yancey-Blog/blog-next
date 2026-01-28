import { isSuperAdmin } from '@/lib/auth-utils'
import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { requireAuth } from '@/lib/session'
import { desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

// GET /api/admin/sessions - Get all active sessions
export async function GET() {
  try {
    const session = await requireAuth()

    // Only super admins can view sessions
    if (!isSuperAdmin(session.user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const sessions = await db
      .select({
        id: schema.sessions.id,
        token: schema.sessions.token,
        expiresAt: schema.sessions.expiresAt,
        ipAddress: schema.sessions.ipAddress,
        userAgent: schema.sessions.userAgent,
        createdAt: schema.sessions.createdAt,
        userId: schema.sessions.userId,
        userName: schema.users.name,
        userEmail: schema.users.email,
        userImage: schema.users.image
      })
      .from(schema.sessions)
      .leftJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
      .where(eq(schema.sessions.expiresAt, schema.sessions.expiresAt))
      .orderBy(desc(schema.sessions.createdAt))

    // Filter out expired sessions
    const now = new Date()
    const activeSessions = sessions.filter((s) => new Date(s.expiresAt) > now)

    return NextResponse.json(activeSessions)
  } catch (error) {
    console.error('Get sessions error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}

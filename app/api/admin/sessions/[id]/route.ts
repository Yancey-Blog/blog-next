import { isSuperAdmin } from '@/lib/auth-utils'
import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { requireAuth } from '@/lib/session'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

// DELETE /api/admin/sessions/[id] - Delete session (force logout)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params

    // Only super admins can delete sessions
    if (!isSuperAdmin(session.user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Prevent deleting your own session
    if (id === session.session.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own session' },
        { status: 400 }
      )
    }

    await db.delete(schema.sessions).where(eq(schema.sessions.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete session error:', error)
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    )
  }
}

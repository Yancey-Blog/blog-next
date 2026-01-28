import { isSuperAdmin } from '@/lib/auth-utils'
import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { requireAuth } from '@/lib/session'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

// PATCH /api/admin/users/[id] - Update user role
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params

    // Only super admins can update user roles
    if (!isSuperAdmin(session.user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { role } = body

    if (!role || !['admin', 'user'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Prevent demoting yourself
    if (id === session.user.id && role !== 'admin') {
      return NextResponse.json(
        { error: 'Cannot demote yourself' },
        { status: 400 }
      )
    }

    const [updatedUser] = await db
      .update(schema.users)
      .set({ role })
      .where(eq(schema.users.id, id))
      .returning()

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/users/[id] - Delete user
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params

    // Only super admins can delete users
    if (!isSuperAdmin(session.user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Prevent deleting yourself
    if (id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete yourself' },
        { status: 400 }
      )
    }

    await db.delete(schema.users).where(eq(schema.users.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}

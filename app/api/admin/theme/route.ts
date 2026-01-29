import { isSuperAdmin } from '@/lib/auth-utils'
import { SettingsService } from '@/lib/services/settings.service'
import { getSessionUser, requireAuth } from '@/lib/session'
import { PRESET_THEMES } from '@/lib/themes'
import { NextResponse } from 'next/server'

// GET /api/admin/theme - Get current theme and available themes
export async function GET() {
  try {
    const session = await requireAuth()
    const user = getSessionUser(session)

    // Only super admins can manage themes
    if (!isSuperAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const currentTheme = await SettingsService.getCurrentTheme()

    return NextResponse.json({
      current: currentTheme,
      themes: PRESET_THEMES.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description
      }))
    })
  } catch (error) {
    console.error('Get theme error:', error)
    return NextResponse.json({ error: 'Failed to get theme' }, { status: 500 })
  }
}

// POST /api/admin/theme - Set current theme
export async function POST(request: Request) {
  try {
    const session = await requireAuth()
    const user = getSessionUser(session)

    // Only super admins can manage themes
    if (!isSuperAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { themeId } = await request.json()

    if (!themeId) {
      return NextResponse.json(
        { error: 'Theme ID is required' },
        { status: 400 }
      )
    }

    // Validate theme exists
    const themeExists = PRESET_THEMES.some((t) => t.id === themeId)
    if (!themeExists) {
      return NextResponse.json({ error: 'Invalid theme ID' }, { status: 400 })
    }

    await SettingsService.setCurrentTheme(themeId)

    return NextResponse.json({ success: true, themeId })
  } catch (error) {
    console.error('Set theme error:', error)
    return NextResponse.json({ error: 'Failed to set theme' }, { status: 500 })
  }
}

import { MeijiBackground } from '@/components/meiji/meiji-background'
import { MeijiHero } from '@/components/meiji/meiji-hero'
import { MeijiMediaFeed } from '@/components/meiji/meiji-media-feed'
import { MeijiService } from '@/lib/services/meiji.service'

// Content is edited from the admin, so always render fresh.
export const dynamic = 'force-dynamic'

export default async function MeijiPage() {
  const [profile, media, scrapbook] = await Promise.all([
    MeijiService.getProfile(),
    MeijiService.listMedia(),
    MeijiService.getScrapbook()
  ])

  return (
    <>
      <MeijiBackground />
      <main>
        <MeijiHero profile={profile} scrapbook={scrapbook} />
        <MeijiMediaFeed media={media} />
      </main>
      <footer className="px-6 pt-4 pb-12 text-center">
        <p className="text-sm font-bold" style={{ color: 'var(--m-ink-soft)' }}>
          Made with 🧶 for {profile.name}
        </p>
      </footer>
    </>
  )
}

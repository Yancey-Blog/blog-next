import { MeijiBackground } from '@/components/meiji/meiji-background'
import { MeijiFeaturedTweets } from '@/components/meiji/meiji-featured-tweets'
import { MeijiHero } from '@/components/meiji/meiji-hero'
import { MeijiMediaFeed } from '@/components/meiji/meiji-media-feed'
import { MeijiService } from '@/lib/services/meiji.service'

// Content is edited from the admin, so always render fresh.
export const dynamic = 'force-dynamic'

export default async function MeijiPage() {
  const [profile, media, tweets, scrapbook] = await Promise.all([
    MeijiService.getProfile(),
    MeijiService.listMedia(),
    MeijiService.getFeaturedTweets(),
    MeijiService.getScrapbook()
  ])

  return (
    <>
      <MeijiBackground />
      <main>
        <MeijiHero profile={profile} scrapbook={scrapbook} />
        <MeijiMediaFeed media={media} />
        <MeijiFeaturedTweets tweets={tweets} />
      </main>
      <footer className="px-6 pb-12 pt-4 text-center">
        <p className="text-sm font-bold" style={{ color: 'var(--m-ink-soft)' }}>
          Made with 🧶 for {profile.name} ·{' '}
          <a
            href={`https://x.com/${profile.xHandle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-wavy underline-offset-4"
          >
            @{profile.xHandle}
          </a>
        </p>
      </footer>
    </>
  )
}

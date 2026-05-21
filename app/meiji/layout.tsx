import type { Metadata } from 'next'
import './meiji.css'

export const metadata: Metadata = {
  title: '明治 · Meiji the Cat',
  description:
    'Meet Meiji (明治です！) — a Blue Golden Shaded British Shorthair. Photos, videos, and milestones of one very fluffy boy.',
  openGraph: {
    title: '明治 · Meiji the Cat',
    description:
      'Photos, videos, and milestones of Meiji, a Blue Golden Shaded British Shorthair.',
    type: 'profile'
  },
  twitter: { card: 'summary_large_image', creator: '@meiji_20260305' }
}

export default function MeijiLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {/* Rounded display + a Japanese-capable rounded body font (for 明治です！).
          Loaded via <link> (App Router hoists it to <head>) because next/font's
          latin subset would drop the kanji/kana glyphs. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&family=M+PLUS+Rounded+1c:wght@400;500;700;800&display=swap"
      />
      <div className="meiji-root">{children}</div>
    </>
  )
}

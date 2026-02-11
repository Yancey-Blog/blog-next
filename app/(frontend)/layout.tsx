import '@/app/globals.css'
import { FrontendFooter } from '@/components/frontend-footer'
import { FrontendHeader } from '@/components/frontend-header'
import { GoogleAnalytics } from '@/components/google-analytics'
import { ThemeModeProvider } from '@/components/theme-mode-provider'
import { Toaster } from '@/components/ui/sonner'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
})

export const metadata: Metadata = {
  title: {
    default: 'Yancey Blog',
    template: '%s | Yancey Blog'
  },
  description:
    "Yancey's personal blog - Thoughts, stories and ideas about technology, design, and life",
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Yancey Blog'
  },
  formatDetection: {
    telephone: false
  },
  openGraph: {
    type: 'website',
    siteName: 'Yancey Blog',
    title: {
      default: 'Yancey Blog',
      template: '%s | Yancey Blog'
    },
    description:
      "Yancey's personal blog - Thoughts, stories and ideas about technology, design, and life"
  },
  twitter: {
    card: 'summary_large_image',
    title: {
      default: 'Yancey Blog',
      template: '%s | Yancey Blog'
    },
    description:
      "Yancey's personal blog - Thoughts, stories and ideas about technology, design, and life"
  }
}

export default function Layout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ThemeModeProvider>
      <GoogleAnalytics />
      <FrontendHeader />
      {children}
      <FrontendFooter />
      <Toaster />
    </ThemeModeProvider>
  )
}

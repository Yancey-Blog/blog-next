import { GoogleAnalytics } from '@/components/google-analytics'
import { FrontendFooter } from '@/components/frontend-footer'
import { FrontendHeader } from '@/components/frontend-header'
import { ThemeModeProvider } from '@/components/theme-mode-provider'
import { Toaster } from '@/components/ui/sonner'
import type { Metadata } from 'next'

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

export default function FrontendLayout({
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

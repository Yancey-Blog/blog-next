import '@/app/globals.css'
import { GoogleAnalytics } from '@/app/google-analytics'
import { FrontendFooter } from '@/components/frontend-footer'
import { FrontendHeader } from '@/components/frontend-header'
import { ThemeModeProvider } from '@/components/theme-mode-provider'
import { Toaster } from '@/components/ui/sonner'
import { TRPCReactProvider } from '@/lib/trpc/client'
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

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TRPCReactProvider>
          <ThemeModeProvider>
            <GoogleAnalytics />
            <FrontendHeader />
            {children}
            <FrontendFooter />
            <Toaster />
          </ThemeModeProvider>
        </TRPCReactProvider>
      </body>
    </html>
  )
}

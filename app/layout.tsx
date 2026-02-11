import '@/app/globals.css'
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
    "Yancey's personal blog - Thoughts, stories and ideas about technology, design, and life"
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
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  )
}

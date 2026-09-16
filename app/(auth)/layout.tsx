import type { Metadata } from 'next'

import { Toaster } from '@/components/ui/toast'

export const metadata: Metadata = {
  title: 'Blog CMS',
  description: 'Blog content management system'
}

export default function AuthLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      {children}
      <Toaster />
    </>
  )
}

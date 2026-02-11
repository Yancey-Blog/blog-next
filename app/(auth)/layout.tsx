import { Toaster } from '@/components/ui/sonner'
import type { Metadata } from 'next'

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

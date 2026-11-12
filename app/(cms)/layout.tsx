import dynamic from 'next/dynamic'

import { AppSidebar } from '@/components/app-sidebar'

const ReactQueryDevtools =
  process.env.NODE_ENV === 'development'
    ? dynamic(() =>
        import('@tanstack/react-query-devtools').then(
          (m) => m.ReactQueryDevtools
        )
      )
    : () => null

import { Metadata } from 'next'

import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/toast'
import { requireAuth } from '@/lib/auth/session'

export const metadata: Metadata = {
  title: 'CMS | Yancey Inc.',
  description: 'Content management system for Yancey Inc.'
}

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode
}) {
  await requireAuth()

  return (
    <div className="bg-sidebar">
      <ReactQueryDevtools initialIsOpen={false} />
      <SidebarProvider
        style={
          {
            '--sidebar-width': 'calc(var(--spacing) * 72)',
            '--header-height': 'calc(var(--spacing) * 12)'
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2 p-4">
              {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
      <Toaster />
    </div>
  )
}

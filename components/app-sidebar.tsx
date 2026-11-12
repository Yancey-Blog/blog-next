'use client'

import {
  Cat,
  FileText,
  LayoutDashboard,
  PawPrint,
  NotebookPen
} from 'lucide-react'
import * as React from 'react'

import { NavMain } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { authClient } from '@/lib/auth/auth-client'

const data = {
  navMain: [
    {
      title: 'Dashboard',
      url: '/admin',
      icon: LayoutDashboard
    },
    {
      title: 'Blog Management',
      url: '/admin/blog-management',
      icon: FileText,
      items: [
        { title: 'Posts', url: '/admin/blog-management' },
        { title: 'Media Assets', url: '/admin/blog-management/media-assets' }
      ]
    },
    {
      title: 'Hikki Community',
      url: '/admin/hikki-management',
      icon: NotebookPen
    },
    {
      title: '明治ちゃん',
      url: '/admin/meiji-management',
      icon: Cat
    }
  ]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = authClient.useSession()

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={
                <a href="/admin">
                  <PawPrint className="size-5!" />
                  <span className="text-base font-semibold">Yancey Inc.</span>
                </a>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        {user.data?.user && <NavUser user={user.data?.user} />}
      </SidebarFooter>
    </Sidebar>
  )
}

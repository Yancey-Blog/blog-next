'use client'

import {
  Cat,
  FileText,
  LayoutDashboard,
  PawPrint,
  NotebookPen,
  Users
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
      title: 'Blog',
      url: '/admin/blog-management',
      icon: FileText,
      items: [
        { title: 'Posts', url: '/admin/blog-management' },
        { title: 'Settings', url: '/admin/blog-management/settings' }
      ]
    },
    {
      title: 'Hikki',
      url: '/admin/hikki-management',
      icon: NotebookPen
    },
    {
      title: 'Meiji',
      url: '/admin/meiji-management',
      icon: Cat
    },
    {
      title: 'Auth Management',
      url: '/admin/management',
      icon: Users
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
                  <span className="text-base font-semibold">CMS</span>
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

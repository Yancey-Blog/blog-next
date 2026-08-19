'use client'

import {
  IconCat,
  IconDashboard,
  IconFileDescription,
  IconInnerShadowTop,
  IconSettings,
  IconUsers
} from '@tabler/icons-react'
import * as React from 'react'

import { NavMain } from '@/components/nav-main'
import { NavSecondary } from '@/components/nav-secondary'
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
      icon: IconDashboard
    },
    {
      title: 'Blog Management',
      url: '/admin/blog-management',
      icon: IconFileDescription
    },
    {
      title: 'Auth Management',
      url: '/admin/management',
      icon: IconUsers
    },
    {
      title: 'Meiji',
      url: '/admin/meiji-management',
      icon: IconCat
    }
  ],
  navSecondary: [
    {
      title: 'Settings',
      url: '/admin/settings',
      icon: IconSettings
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
                  <IconInnerShadowTop className="size-5!" />
                  <span className="text-base font-semibold">Blog Admin</span>
                </a>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        {user.data?.user && <NavUser user={user.data?.user} />}
      </SidebarFooter>
    </Sidebar>
  )
}

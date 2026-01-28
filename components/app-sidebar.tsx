'use client'

import {
  IconDashboard,
  IconDeviceDesktop,
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
import { authClient } from '@/lib/auth-client'

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
      title: 'User Management',
      url: '/admin/users',
      icon: IconUsers
    },
    {
      title: 'Session Management',
      url: '/admin/sessions',
      icon: IconDeviceDesktop
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
  console.log(user.data?.user)

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="/admin">
                <IconInnerShadowTop className="size-5!" />
                <span className="text-base font-semibold">Blog Admin</span>
              </a>
            </SidebarMenuButton>
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

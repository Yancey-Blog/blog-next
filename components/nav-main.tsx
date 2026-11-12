'use client'

import { type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton
} from '@/components/ui/sidebar'

export function NavMain({
  items
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    items?: { title: string; url: string }[]
  }[]
}) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu className="gap-1">
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <Link href={item.url}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={
                    pathname === item.url ||
                    (!!item.items && pathname.startsWith(`${item.url}/`))
                  }
                >
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </Link>
              {item.items &&
                (pathname === item.url ||
                  pathname.startsWith(`${item.url}/`)) && (
                  <SidebarMenuSub>
                    {item.items.map((child) => (
                      <SidebarMenuSubItem key={child.url}>
                        <SidebarMenuSubButton
                          render={<Link href={child.url} />}
                          isActive={pathname === child.url}
                          aria-current={
                            pathname === child.url ? 'page' : undefined
                          }
                        >
                          <span>{child.title}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

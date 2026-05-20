"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  ListIcon,
  ChartBarIcon,
  FolderIcon,
  UsersIcon,
  CircleHelpIcon,
  SearchIcon,
  LightbulbIcon,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { useLeads } from "@/context/leads-context"

const supabase = createClient()

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [user, setUser] = React.useState<User | null>(null)
  const { setAddLeadOpen } = useLeads()

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  const navMain = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "Leads",
      url: "/dashboard/leads",
      icon: <ListIcon />,
      // Triggers the context modal state when clicked
      onClick: (e: React.MouseEvent) => {
        e.preventDefault()
        setAddLeadOpen(true)
      },
    },
    {
      title: "Team",
      url: "/dashboard/team",
      icon: <UsersIcon />,
    },
  ]

  const navSecondary = [
    {
      title: "Get Help",
      url: "/dashboard/help",
      icon: <CircleHelpIcon />,
    },
  ]

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="/dashboard" className="flex items-center gap-2">
                <LightbulbIcon className="size-5!" />
                <span className="text-base font-semibold">Leadly.</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
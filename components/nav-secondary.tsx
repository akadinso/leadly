"use client"

import * as React from "react"
import { SearchIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  Dialog,
  DialogContent,
  DialogTitle, // 1. Import DialogTitle natively from your local components folder
} from "@/components/ui/dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { createClient } from "@/lib/supabase/client"

interface NavSecondaryProps extends React.ComponentPropsWithoutRef<typeof SidebarGroup> {
  items: {
    title: string
    url: string
    icon: React.ReactNode
  }[]
}

interface LeadSuggestion {
  id: string
  lead: string
  business_name: string
}

export function NavSecondary({ items, ...props }: NavSecondaryProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [leads, setLeads] = React.useState<LeadSuggestion[]>([])
  const supabase = createClient()

  // Fetch lead identity details when search opens
  React.useEffect(() => {
    async function fetchLeadsForSearch() {
      const { data, error } = await supabase
        .from("leads")
        .select("id, lead, business_name")
        .order("business_name", { ascending: true })

      if (!error && data) {
        setLeads(data)
      }
    }

    if (open) {
      fetchLeadsForSearch()
    }
  }, [open])

  // Hotkey listener (Ctrl+K or Cmd+K)
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const handleSelectLead = (leadId: string) => {
    setOpen(false)
    router.push(`/dashboard/leads?id=${leadId}`)
  }

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          
          {/* Action Trigger for the Search Box */}
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={() => setOpen(true)}
              className="w-full text-left text-muted-foreground hover:text-foreground flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <SearchIcon className="size-4" />
                <span>Search leads...</span>
              </div>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Navigation Items */}
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <Link href={item.url}>
                  {item.icon}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          
        </SidebarMenu>
      </SidebarGroupContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 shadow-lg max-w-[550px]">
          
          {/* 2. FIXED: Tailwind sr-only safely hides the native header from view while remaining readable by screen readers */}
          <DialogTitle className="sr-only">Search Leads Database</DialogTitle>

          <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2">
            <CommandInput placeholder="Type a business name or contact person..." />
            <CommandList>
              <CommandEmpty>No matching leads found.</CommandEmpty>
              <CommandGroup heading="Registered Leads">
                {leads.map((lead) => (
                  <CommandItem
                    key={lead.id}
                    value={`${lead.business_name || ""} ${lead.lead || ""}`.trim().toLowerCase()}
                    onSelect={() => handleSelectLead(lead.id)}
                    className="cursor-pointer flex flex-col items-start"
                  >
                    <span className="font-medium text-foreground">{lead.business_name || "Unknown Company"}</span>
                    <span className="text-xs text-muted-foreground">{lead.lead}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </SidebarGroup>
  )
}
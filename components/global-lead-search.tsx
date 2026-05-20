"use client"

import * as React from "react"
import { SearchIcon, Building2Icon, UserIcon, ArrowRightIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

interface LeadSuggestion {
  id: string
  lead: string        // Primary contact name
  business_name: string
  status?: string
}

export function GlobalLeadSearch() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [leads, setLeads] = React.useState<LeadSuggestion[]>([])
  const supabase = createClient()

  // 1. Fetch search indices directly from Supabase
  React.useEffect(() => {
    async function fetchLeadsForSearch() {
      const { data, error } = await supabase
        .from("leads")
        .select("id, lead, business_name, status")
        .order("business_name", { ascending: true })

      if (!error && data) {
        setLeads(data)
      }
    }

    if (open) {
      fetchLeadsForSearch()
    }
  }, [open])

  // 2. Global Hotkey listener (Cmd+K or Ctrl+K)
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
    // Routes directly to the view/edit/delete layout handler for this ID
    router.push(`/dashboard/leads?id=${leadId}`)
  }

  return (
    <>
      {/* Search trigger button. Drop this inside your top bar or sidebar header */}
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-sm items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <div className="flex items-center gap-2">
          <SearchIcon className="size-4 shrink-0 opacity-60" />
          <span>Quick search leads...</span>
        </div>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Interactive Autocomplete Overlay */}
      <GlobalLeadSearch/>
    </>
  )
}
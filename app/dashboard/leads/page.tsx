// app/leads/page.tsx
"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { DataTable } from "@/components/data-table" // Adjust this path to match your layout directory

// 1. Move the search params logic and table into a separate child component
function LeadsContent() {
  const searchParams = useSearchParams()
  const activeLeadId = searchParams.get("id")

  return (
    <DataTable activeLeadId={activeLeadId ? parseInt(activeLeadId, 10) : null} />
  )
}

// 2. The main page component handles the layout and wraps the content in Suspense
export default function LeadsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leads Workspace</h1>
        <p className="text-sm text-muted-foreground">
          Manage pipeline records, reassign staff allocations, and audit incoming consumer touchpoints.
        </p>
      </div>

      {/* 
        FIXED: Wrapping in React.Suspense tells Next.js to safely skip static 
        prerendering for the inner table during the Vercel build phase.
      */}
      <React.Suspense fallback={
        <div className="flex h-[400px] items-center justify-center text-sm text-muted-foreground border rounded-lg border-dashed">
          Loading workspace components…
        </div>
      }>
        <LeadsContent />
      </React.Suspense>
    </div>
  )
}
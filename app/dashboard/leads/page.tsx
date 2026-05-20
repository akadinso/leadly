// app/leads/page.tsx
"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { DataTable } from "@/components/data-table" // Adjust this path to match your layout directory

export default function LeadsPage() {
  const searchParams = useSearchParams()
  const activeLeadId = searchParams.get("id")

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leads Workspace</h1>
        <p className="text-sm text-muted-foreground">
          Manage pipeline records, reassign staff allocations, and audit incoming consumer touchpoints.
        </p>
      </div>

      {/* Main Datatable containing the standalone dynamic overlay panels */}
      <DataTable activeLeadId={activeLeadId ? parseInt(activeLeadId, 10) : null} />
    </div>
  )
}
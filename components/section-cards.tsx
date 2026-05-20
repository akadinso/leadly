"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { 
  TrendingUpIcon, 
  TrendingDownIcon, 
  UserPlusIcon, 
  CheckCircle2Icon, 
  UsersIcon, 
  CircleDotIcon 
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

interface AssigneeProfile {
  id: string
  name: string
}

interface SectionCardsProps {
  leads?: any[]
  assignees?: AssigneeProfile[] // Added to cross-reference database IDs with real-world names
}

export function SectionCards({ leads = [], assignees = [] }: SectionCardsProps) {
  const [metrics, setMetrics] = React.useState({
    totalRegistered: 0,
    monthRegistered: 0,
    totalDone: 0,
    closeRate: 0,
  })
  const [loading, setLoading] = React.useState(true)

  // 1. Build a quick look-up map from the formal assignees array roster
  const staffDirectoryMap = React.useMemo(() => {
    const directory: Record<string, string> = {}
    assignees.forEach((member) => {
      if (member?.id) directory[member.id] = member.name
    })
    return directory
  }, [assignees])

  // 2. Compute dynamic team allocations instantly from the leads stream
  const teamMetrics = React.useMemo(() => {
    if (!leads || leads.length === 0) return []

    const counts: Record<string, { name: string; total: number; done: number; pending: number }> = {}

    leads.forEach((item) => {
      // Fallback Hierarchy: Check map first, then relational join, then default to unassigned
      const targetId = item.assignee_id || "unassigned"
      let name = "Unassigned Buffer"
      
      if (targetId !== "unassigned" && staffDirectoryMap[targetId]) {
        name = staffDirectoryMap[targetId]
      } else if (item.assignees?.name) {
        name = item.assignees.name
      }

      if (!counts[targetId]) {
        counts[targetId] = { name, total: 0, done: 0, pending: 0 }
      }

      counts[targetId].total += 1
      if (item.status === "Done") {
        counts[targetId].done += 1
      } else {
        counts[targetId].pending += 1
      }
    })

    return Object.values(counts).sort((a, b) => b.total - a.total)
  }, [leads, staffDirectoryMap])

  React.useEffect(() => {
    async function calculateMetrics() {
      try {
        setLoading(true)

        // Fetch total registered leads count
        const { count: totalLeads, error: totalError } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true })

        // Fetch leads registered in the current month
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
        const { count: monthLeads, error: monthError } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .gte("created_at", firstDayOfMonth)

        // Fetch total leads marked as 'Done'
        const { count: doneLeads, error: doneError } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("status", "Done")

        if (totalError || monthError || doneError) {
          console.error("Supabase metrics sync failed:", { totalError, monthError, doneError })
          return
        }

        const total = totalLeads || 0
        const done = doneLeads || 0
        const computedCloseRate = total > 0 ? Math.round((done / total) * 100) : 0

        setMetrics({
          totalRegistered: total,
          monthRegistered: monthLeads || 0,
          totalDone: done,
          closeRate: computedCloseRate,
        })
      } catch (err) {
        console.error("Error computing dashboard card aggregates:", err)
      } finally {
        setLoading(false)
      }
    }

    calculateMetrics()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="h-32">
            <CardHeader className="space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-1/3" />
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* SECTION 1: Your Original 4 Global Overview Counters */}
      <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
        
        {/* Total Registered Leads */}
        <Card className="@container/card" data-slot="card">
          <CardHeader className="space-y-1">
            <CardDescription className="flex items-center gap-1.5">
              <UserPlusIcon className="size-3.5 text-muted-foreground" /> Total Registered Leads
            </CardDescription>
            <div className="flex items-baseline justify-between gap-2">
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {metrics.totalRegistered.toLocaleString()}
              </CardTitle>
              <Badge variant="outline" className="flex items-center gap-1 shrink-0">
                <TrendingUpIcon className="size-3" />
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Database population synchronized
            </div>
            <div className="text-muted-foreground">
              Total signups across all data pipelines
            </div>
          </CardFooter>
        </Card>

        {/* New Registrations This Month */}
        <Card className="@container/card" data-slot="card">
          <CardHeader className="space-y-1">
            <CardDescription>New Registrations (This Month)</CardDescription>
            <div className="flex items-baseline justify-between gap-2">
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {metrics.monthRegistered.toLocaleString()}
              </CardTitle>
              <Badge variant="outline" className="flex items-center gap-1 shrink-0">
                <TrendingUpIcon className="size-3" />
                MoM
              </Badge>
            </div>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Acquisition volume tracked active
            </div>
            <div className="text-muted-foreground">
              Created inside current calendar month boundary
            </div>
          </CardFooter>
        </Card>

        {/* Total Done Leads */}
        <Card className="@container/card" data-slot="card">
          <CardHeader className="space-y-1">
            <CardDescription className="flex items-center gap-1.5">
              <CheckCircle2Icon className="size-3.5 text-muted-foreground" /> Total Done Leads
            </CardDescription>
            <div className="flex items-baseline justify-between gap-2">
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {metrics.totalDone.toLocaleString()}
              </CardTitle>
              <Badge variant="outline" className="flex items-center gap-1 shrink-0">
                <TrendingUpIcon className="size-3" />
                Success
              </Badge>
            </div>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Conversion metrics updated
            </div>
            <div className="text-muted-foreground">
              Successfully closed or completed pipelines
            </div>
          </CardFooter>
        </Card>

        {/* Lead Close Rate */}
        <Card className="@container/card" data-slot="card">
          <CardHeader className="space-y-1">
            <CardDescription>Lead Close Rate</CardDescription>
            <div className="flex items-baseline justify-between gap-2">
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {metrics.closeRate}%
              </CardTitle>
              <Badge variant="outline" className="flex items-center gap-1 shrink-0">
                {metrics.closeRate >= 25 ? (
                  <TrendingUpIcon className="size-3 text-emerald-500" />
                ) : (
                  <TrendingDownIcon className="size-3 text-amber-500" />
                )}
                Ratio
              </Badge>
            </div>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              {metrics.closeRate}% converted to Done
            </div>
            <div className="text-muted-foreground">
              Percentage proportion of total incoming traffic
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Visual dividing element between global layout and teammate grid layout */}
      <div className="px-4 lg:px-6">
        <Separator />
      </div>

      {/* SECTION 2: Team Assignee Specific Breakdown Sub-Grid */}
      <div className="px-4 lg:px-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <UsersIcon className="size-4" /> Team Assignment Distribution
        </h2>
        
        {teamMetrics.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No team assignments parsed in active runtime layout.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {teamMetrics.map((assignee) => {
              const staffCloseRate = assignee.total > 0 ? Math.round((assignee.done / assignee.total) * 100) : 0
              
              return (
                <div 
                  key={assignee.name} 
                  className="rounded-xl border bg-card p-4 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground truncate max-w-[150px]">
                        {assignee.name}
                      </span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                        {staffCloseRate}% rate
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold tracking-tight mt-1 tabular-nums">
                      {assignee.total}
                      <span className="text-xs font-normal text-muted-foreground ml-1">leads</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-3 pt-2 border-t border-dashed">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-500 font-medium">
                      <CheckCircle2Icon className="size-3" /> {assignee.done} Done
                    </span>
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-500 font-medium">
                      <CircleDotIcon className="size-3" /> {assignee.pending} Open
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
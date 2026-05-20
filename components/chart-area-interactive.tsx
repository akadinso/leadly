"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

// Provided distinct visual colors for total vs completed streams
const chartConfig = {
  total: {
    label: "Total Leads",
    color: "hsl(var(--primary))",
  },
  done: {
    label: "Done Leads",
    color: "hsl(var(--chart-2, 142.1 76.2% 36.3%))", // Deployed standard green fallback token
  },
} satisfies ChartConfig

type ChartRow = {
  date: string
  total: number
  done: number
}

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("90d")
  const [chartData, setChartData] = React.useState<ChartRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dateColumn, setDateColumn] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (isMobile) setTimeRange("7d")
  }, [isMobile])

  React.useEffect(() => {
    async function fetchData() {
      setLoading(true)

      const { data: leads, error } = await supabase
        .from("leads")
        .select("*")
        .order("id", { ascending: true })
        .limit(1)

      if (error || !leads?.length) {
        setLoading(false)
        return
      }

      const sample = leads[0]
      const col = "created_at" in sample
        ? "created_at"
        : "date" in sample
        ? "date"
        : "updated_at" in sample
        ? "updated_at"
        : null

      setDateColumn(col)

      if (!col) {
        setLoading(false)
        return
      }

      const { data: allLeads, error: allError } = await supabase
        .from("leads")
        .select(`${col}, status`)

      if (allError || !allLeads) {
        setLoading(false)
        return
      }

      const grouped: Record<string, { total: number; done: number }> = {}

      for (const lead of allLeads) {
        const raw = lead[col]
        if (!raw) continue
        
        // Clean timestamp validation wrapper
        const parsedDate = new Date(raw)
        if (isNaN(parsedDate.getTime())) continue

        const date = parsedDate.toISOString().split("T")[0]
        if (!grouped[date]) grouped[date] = { total: 0, done: 0 }
        grouped[date].total++
        if (lead.status === "Done") grouped[date].done++
      }

      const rows: ChartRow[] = Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, counts]) => ({ date, ...counts }))

      setChartData(rows)
      setLoading(false)
    }

    fetchData()
  }, [])

  const filteredData = React.useMemo(() => {
    if (!chartData.length) return []
    const referenceDate = new Date(chartData[chartData.length - 1].date)
    const daysToSubtract = timeRange === "30d" ? 30 : timeRange === "7d" ? 7 : 90
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return chartData.filter((item) => new Date(item.date) >= startDate)
  }, [chartData, timeRange])

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Leads Over Time</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Total leads vs completed — last {timeRange === "90d" ? "3 months" : timeRange === "30d" ? "30 days" : "7 days"}
          </span>
          <span className="@[540px]/card:hidden">
            {timeRange === "90d" ? "Last 3 months" : timeRange === "30d" ? "Last 30 days" : "Last 7 days"}
          </span>
          {!dateColumn && !loading && (
            <span className="block text-destructive text-xs mt-1">
              No date column found on leads table (tried: created_at, date, updated_at)
            </span>
          )}
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={(val) => val && setTimeRange(val)}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">Last 3 months</SelectItem>
              <SelectItem value="30d" className="rounded-lg">Last 30 days</SelectItem>
              <SelectItem value="7d" className="rounded-lg">Last 7 days</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {loading ? (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            Loading chart…
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            No data for this period.
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="fillDone" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-done)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-done)" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <ChartTooltip
                cursor={true}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    }
                    indicator="dot"
                  />
                }
              />
              {/* Removed stackId parameter so data layers accurately over baseline values */}
              <Area
                dataKey="total"
                type="monotone"
                fill="url(#fillTotal)"
                stroke="var(--color-total)"
                strokeWidth={2}
              />
              <Area
                dataKey="done"
                type="monotone"
                fill="url(#fillDone)"
                stroke="var(--color-done)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
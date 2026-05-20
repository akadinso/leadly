import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { createClient } from '@/lib/supabase/server'
import { redirect } from "next/navigation";

export default async function Page() {
  const supabase = await createClient()

  // 1. Authenticate the session first
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  // 2. Fetch data concurrently to prevent sequential waterfall loading bottlenecks
  const [leadsResponse, assigneesResponse] = await Promise.all([
    supabase
      .from("leads")
      .select(`
        *,
        assignees (
          id,
          name
        )
      `),
    supabase
      .from("assignees")
      .select("id, name")
  ])

  // 3. Gracefully handle errors or provide default empty arrays to avoid page crashing
  const leads = leadsResponse.data || []
  const assignees = assigneesResponse.data || []

  return (
    <>
      <SectionCards leads={leads} assignees={assignees} />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div>
      {/* If your DataTable also needs this data to prevent double-fetching inside the client, 
          you can pass them down as props here as well: e.g., <DataTable initialData={leads} /> */}
      <DataTable />
    </>
  );
}
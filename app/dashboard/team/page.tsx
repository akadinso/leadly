import { createClient } from '@/lib/supabase/server'
import { redirect } from "next/navigation"
import Link from "next/link"
import { UserIcon, BriefcaseIcon, ChevronRightIcon } from "lucide-react"

export default async function Page() {
  const supabase = await createClient()

  // 1. Authenticate the session
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  // 2. Fetch data concurrently
  const [leadsResponse, assigneesResponse] = await Promise.all([
    supabase
      .from("leads")
      .select(`
        id,
        lead,
        business_name,
        status,
        assignee_id
      `), // FIX: Corrected typo from assignfee_id to assignee_id
    supabase
      .from("assignees")
      .select("id, name, email")
      .order("name", { ascending: true })
  ])

  const rawLeads = leadsResponse.data || []
  const assignees = assigneesResponse.data || []

  // 3. Map the leads to their respective assignees for easy listing
  const assigneesWithLeads = assignees.map((assignee) => {
    // FIX: This now accurately filters because lead.assignee_id exists
    const assignedLeads = rawLeads.filter((lead) => lead.assignee_id === assignee.id)
    return {
      ...assignee,
      leads: assignedLeads,
    }
  })

  return (
    <div className="space-y-6 p-4 lg:p-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Assignee Workloads</h1>
        <p className="text-sm text-muted-foreground">
          A real-time overview of active lead distributions across team operators.
        </p>
      </div>

      <div className="grid gap-4">
        {assigneesWithLeads.map((member) => (
          <div 
            key={member.id} 
            className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden"
          >
            {/* Assignee Header Card */}
            <div className="border-b bg-muted/40 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2 text-primary">
                  <UserIcon className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base leading-none">{member.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{member.email || "No email listed"}</p>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary border border-primary/20">
                {member.leads.length} {member.leads.length === 1 ? 'Lead' : 'Leads'}
              </span>
            </div>

            {/* Nested Assigned Leads List */}
            <div className="divide-y">
              {member.leads.length === 0 ? (
                <div className="px-6 py-4 text-sm text-muted-foreground italic text-center bg-background">
                  No active lead assignments.
                </div>
              ) : (
                member.leads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/dashboard/leads?id=${lead.id}`}
                    className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/50 transition-colors group bg-background"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <BriefcaseIcon className="size-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">
                          {lead.business_name || "Unknown Company"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          Contact: {lead.lead || "Not assigned"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {lead.status && (
                        <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground border">
                          {lead.status}
                        </span>
                      )}
                      <ChevronRightIcon className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link> // FIX: Replaced broken </ui> close marker tag with a proper closing </Link> component tag
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
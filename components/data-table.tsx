"use client"

import * as React from "react"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { toast } from "sonner"
import { z } from "zod"

import { useIsMobile } from "@/hooks/use-mobile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import {
  GripVerticalIcon,
  CircleCheckIcon,
  LoaderIcon,
  EllipsisVerticalIcon,
  Columns3Icon,
  ChevronDownIcon,
  ChevronsLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsRightIcon,
  TrendingUpIcon,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useLeads } from "@/context/leads-context"

const supabase = createClient()

export const assigneeSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
})

export const schema = z.object({
  id: z.number(),
  lead: z.string().nullable().transform((v) => v ?? ""),
  service: z.string().nullable().transform((v) => v ?? ""),
  status: z.string().nullable().transform((v) => v ?? ""),
  business_name: z.string().nullable().transform((v) => v ?? ""),
  phone: z.string().nullable().transform((v) => v ?? ""),
  assignee_id: z.string().uuid().nullable().transform((v) => v ?? ""),
  assignees: assigneeSchema.nullable().optional(),
})

type Lead = z.infer<typeof schema>
type Assignee = z.infer<typeof assigneeSchema>

const defaultNewLead = {
  lead: "",
  service: "Sales Funnel",
  status: "Not Started",
  business_name: "",
  phone: "",
  assignee_id: "",
}

function normalizeLead(raw: unknown): Lead | null {
  const result = schema.safeParse(raw)
  return result.success ? result.data : null
}

function DragHandle({ id }: { id: number }) {
  const { attributes, listeners } = useSortable({ id })
  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground hover:bg-transparent"
    >
      <GripVerticalIcon className="size-3 text-muted-foreground" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  )
}

async function updateLeadField(id: number, payload: Record<string, any>) {
  const { error } = await supabase.from("leads").update(payload).eq("id", id)
  if (error) throw error
}

const columns: ColumnDef<Lead>[] = [
  {
    id: "drag",
    header: () => null,
    cell: ({ row }) => <DragHandle id={row.original.id} />,
    size: 40,
  },
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center w-8">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center w-8">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "lead",
    header: "Lead",
    cell: ({ row, table }) => (
      <TableCellViewer 
        item={row.original} 
        openTriggerRef={(openFn) => {
          if ((table.options.meta as any)?.registerRowTrigger) {
            (table.options.meta as any).registerRowTrigger(row.original.id, openFn)
          }
        }}
      />
    ),
    enableHiding: false,
  },
  {
    accessorKey: "service",
    header: "Service",
    cell: ({ row }) => (
      <div className="w-32">
        <Select
          defaultValue={row.original.service}
          onValueChange={(val) => {
            toast.promise(updateLeadField(row.original.id, { service: val }), {
              loading: "Updating service...",
              success: "Service updated",
              error: "Failed to update service",
            })
          }}
        >
          <SelectTrigger className="h-8 border-transparent bg-transparent shadow-none hover:bg-input/30">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Sales Funnel">Sales Funnel</SelectItem>
            <SelectItem value="Lead Generation">Lead Generation</SelectItem>
            <SelectItem value="Automation">Automation</SelectItem>
          </SelectContent>
        </Select>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <div className="w-36">
        <Select
          defaultValue={row.original.status}
          onValueChange={(val) => {
            toast.promise(updateLeadField(row.original.id, { status: val }), {
              loading: "Updating status...",
              success: "Status updated",
              error: "Failed to update status",
            })
          }}
        >
          <SelectTrigger className="h-8 border-transparent bg-transparent shadow-none hover:bg-input/30">
            <div className="flex items-center gap-1.5 truncate">
              {row.original.status === "Done" ? (
                <CircleCheckIcon className="size-3.5 fill-green-500 text-background shrink-0" />
              ) : (
                <LoaderIcon className="size-3.5 animate-spin text-muted-foreground shrink-0" />
              )}
              <span className="truncate">{row.original.status}</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Not Started">Not Started</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Done">Done</SelectItem>
          </SelectContent>
        </Select>
      </div>
    ),
  },
  {
    accessorKey: "business_name",
    header: () => <div className="text-left font-medium pl-2">Business Name</div>,
    cell: ({ row }) => {
      const [val, setVal] = React.useState(row.original.business_name)
      return (
        <input
          className="h-8 w-full max-w-[200px] rounded-md border-transparent bg-transparent text-left shadow-none hover:bg-input/30 focus-visible:border-input focus-visible:bg-background focus-visible:outline-none px-2 text-sm"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => {
            if (val === row.original.business_name) return
            toast.promise(updateLeadField(row.original.id, { business_name: val || null }), {
              loading: "Saving business name...",
              success: "Saved",
              error: "Failed to save",
            })
          }}
        />
      )
    },
  },
  {
    accessorKey: "phone",
    header: () => <div className="text-left font-medium pl-2">Phone</div>,
    cell: ({ row }) => {
      const [val, setVal] = React.useState(row.original.phone)
      return (
        <input
          className="h-8 w-full max-w-[150px] rounded-md border-transparent bg-transparent text-left shadow-none hover:bg-input/30 focus-visible:border-input focus-visible:bg-background focus-visible:outline-none px-2 text-sm tabular-nums"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => {
            if (val === row.original.phone) return
            toast.promise(updateLeadField(row.original.id, { phone: val || null }), {
              loading: "Saving phone number...",
              success: "Saved",
              error: "Failed to save",
            })
          }}
        />
      )
    },
  },
  {
    accessorKey: "assignee_id",
    header: "Assignee",
    cell: ({ row, table }) => {
      const teamOptions = (table.options.meta as any)?.assignees || []
      const currentId = row.original.assignee_id || "unassigned"

      return (
        <div className="pl-2 w-44">
          <Label htmlFor={`${row.original.id}-assignee`} className="sr-only">Assignee</Label>
          <Select
            value={currentId}
            onValueChange={(val) => {
              const updatedId = val === "unassigned" ? null : val
              toast.promise(updateLeadField(row.original.id, { assignee_id: updatedId }), {
                loading: "Updating assignee...",
                success: "Lead reassigned successfully",
                error: "Failed to reassign",
              })
            }}
          >
            <SelectTrigger
              className="h-8 border-transparent bg-transparent shadow-none hover:bg-input/30"
              id={`${row.original.id}-assignee`}
            >
              <div className="block truncate max-w-[140px]">
                <SelectValue placeholder="Assign team member" />
              </div>
            </SelectTrigger>
            <SelectContent align="end">
              <SelectGroup>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {teamOptions.map((member: Assignee) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => (
      <div className="flex justify-end pr-2">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex size-8 text-muted-foreground data-[state=open]:bg-muted"
              size="icon"
            >
              <EllipsisVerticalIcon className="size-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem
              onClick={() => {
                if ((table.options.meta as any)?.triggerRowEdit) {
                  (table.options.meta as any).triggerRowEdit(row.original.id)
                }
              }}
            >
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem>Make a copy</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              variant="destructive"
              onClick={() => {
                const deleteAction = async () => {
                  const { error } = await supabase.from("leads").delete().eq("id", row.original.id)
                  if (error) throw error
                  if ((table.options.meta as any)?.onRowDeleted) {
                    (table.options.meta as any).onRowDeleted(row.original.id)
                  }
                }
                toast.promise(deleteAction(), {
                  loading: "Deleting lead...",
                  success: "Lead permanently removed",
                  error: "Could not remove lead record"
                })
              }}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
  },
]

function DraggableRow({ row }: { row: Row<Lead> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  })
  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}

interface DataTableProps {
  activeLeadId?: number | null
}

export function DataTable({ activeLeadId = null }: DataTableProps) {
  const { addLeadOpen, setAddLeadOpen } = useLeads()
  const [data, setData] = React.useState<Lead[]>([])
  const [assignees, setAssignees] = React.useState<Assignee[]>([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [newLead, setNewLead] = React.useState(defaultNewLead)
  
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })
  const sortableId = React.useId()
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  )

  const rowTriggersRef = React.useRef<Record<number, () => void>>({})

  React.useEffect(() => {
    async function loadDashboardDependencies() {
      try {
        setLoading(true)
        const { data: team } = await supabase
          .from("assignees")
          .select("id, name")
          .order("name", { ascending: true })
        if (team) setAssignees(team)

        const { data: rows, error } = await supabase
          .from("leads")
          .select(`
            id, lead, service, status, business_name, phone, assignee_id,
            assignees ( id, name )
          `)
          .order("id", { ascending: true })

        if (error) throw error

        const normalized = (rows ?? []).map(normalizeLead).filter(Boolean) as Lead[]
        setData(normalized)
      } catch (err) {
        toast.error("Failed to load dashboard workspace records")
      } finally {
        setLoading(false)
      }
    }

    loadDashboardDependencies()
  }, [])

  // Deep Link URL Router Synchronization Hook
  React.useEffect(() => {
    if (!loading && activeLeadId && rowTriggersRef.current[activeLeadId]) {
      const timeoutId = setTimeout(() => {
        const openSliderAction = rowTriggersRef.current[activeLeadId]
        if (openSliderAction) {
          openSliderAction()
        }
      }, 120)
      return () => clearTimeout(timeoutId)
    }
  }, [loading, activeLeadId])

  React.useEffect(() => {
    const channel = supabase
      .channel("leads-realtime-sync")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "leads" },
        async (payload) => {
          const { data: updatedRow } = await supabase
            .from("leads")
            .select("id, lead, service, status, business_name, phone, assignee_id, assignees(id, name)")
            .eq("id", payload.new.id)
            .single()

          if (updatedRow) {
            const normalized = normalizeLead(updatedRow)
            if (normalized) {
              setData((prev) => prev.map((item) => (item.id === normalized.id ? normalized : item)))
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function handleAddLead() {
    if (!newLead.lead.trim()) {
      toast.error("Lead name is required")
      return
    }
    setSaving(true)

    const payload = {
      lead: newLead.lead,
      service: newLead.service,
      status: newLead.status,
      business_name: newLead.business_name || null,
      phone: newLead.phone || null,
      assignee_id: newLead.assignee_id || null,
    }

    const { data: inserted, error } = await supabase
      .from("leads")
      .insert([payload])
      .select(`
        id, lead, service, status, business_name, phone, assignee_id,
        assignees ( id, name )
      `)
      .single()

    if (error) {
      toast.error(`Failed to add lead: ${error.message}`)
      setSaving(false)
      return
    }

    const normalized = normalizeLead(inserted)
    if (normalized) {
      setData((prev) => [...prev, normalized])
    }

    setNewLead(defaultNewLead)
    setAddLeadOpen(false)
    toast.success("Lead added")
    setSaving(false)
  }

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data?.map(({ id }) => id) || [],
    [data]
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, rowSelection, columnFilters, pagination },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    meta: {
      assignees,
      registerRowTrigger: (id: number, openFn: () => void) => {
        rowTriggersRef.current[id] = openFn
      },
      triggerRowEdit: (id: number) => {
        const openDrawer = rowTriggersRef.current[id]
        if (openDrawer) openDrawer()
      },
      onRowDeleted: (deletedId: number) => {
        setData((prev) => prev.filter((row) => row.id !== deletedId))
        delete rowTriggersRef.current[deletedId]
      }
    }
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setData((data) => {
        const oldIndex = dataIds.indexOf(active.id)
        const newIndex = dataIds.indexOf(over.id)
        return arrayMove(data, oldIndex, newIndex)
      })
    }
  }

  return (
    <>
      <Dialog open={addLeadOpen} onOpenChange={setAddLeadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Lead</DialogTitle>
            <DialogDescription>Fill in the details for the new lead.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-lead">Lead Name</Label>
              <Input
                id="new-lead"
                placeholder="John Smith"
                value={newLead.lead}
                onChange={(e) => setNewLead((p) => ({ ...p, lead: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="new-service">Service</Label>
                <Select
                  value={newLead.service}
                  onValueChange={(v) => setNewLead((p) => ({ ...p, service: v }))}
                >
                  <SelectTrigger id="new-service" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="Sales Funnel">Sales Funnel</SelectItem>
                      <SelectItem value="Lead Generation">Lead Generation</SelectItem>
                      <SelectItem value="Automation">Automation</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="new-status">Status</Label>
                <Select
                  value={newLead.status}
                  onValueChange={(v) => setNewLead((p) => ({ ...p, status: v }))}
                >
                  <SelectTrigger id="new-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="Done">Done</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Not Started">Not Started</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="new-business">Business Name</Label>
                <Input
                  id="new-business"
                  placeholder="Acme Inc."
                  value={newLead.business_name}
                  onChange={(e) => setNewLead((p) => ({ ...p, business_name: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="new-phone">Phone</Label>
                <Input
                  id="new-phone"
                  placeholder="+1 555 000 0000"
                  value={newLead.phone}
                  onChange={(e) => setNewLead((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
            </div>

            {/* Integrated Assignee Dropdown Selection Option */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-assignee">Assign Team Member</Label>
              <Select
                value={newLead.assignee_id || "unassigned"}
                onValueChange={(v) => 
                  setNewLead((p) => ({ 
                    ...p, 
                    assignee_id: v === "unassigned" ? "" : v 
                  }))
                }
              >
                <SelectTrigger id="new-assignee" className="w-full">
                  <SelectValue placeholder="Select an assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {assignees.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddLeadOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddLead} disabled={saving}>
              {saving ? "Adding…" : "Add Lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="outline" className="w-full flex-col justify-start gap-6">
        <div className="flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Columns3Icon data-icon="inline-start" />
                  Columns
                  <ChevronDownIcon data-icon="inline-end" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                {table
                  .getAllColumns()
                  .filter(
                    (column) =>
                      typeof column.accessorFn !== "undefined" && column.getCanHide()
                  )
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <TabsContent
          value="outline"
          className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
        >
          <div className="overflow-hidden rounded-lg border">
            <DndContext
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={handleDragEnd}
              sensors={sensors}
              id={sortableId}
            >
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody className="**:data-[slot=table-cell]:first:w-8">
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Loading leads…
                      </TableCell>
                    </TableRow>
                  ) : table.getRowModel().rows?.length ? (
                    <SortableContext
                      items={dataIds}
                      strategy={verticalListSortingStrategy}
                    >
                      {table.getRowModel().rows.map((row) => (
                        <DraggableRow key={row.id} row={row} />
                      ))}
                    </SortableContext>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </DndContext>
          </div>
          <div className="flex items-center justify-between px-4">
            <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
              {table.getFilteredSelectedRowModel().rows.length} of{" "}
              {table.getFilteredRowModel().rows.length} row(s) selected.
            </div>
            <div className="flex w-full items-center gap-8 lg:w-fit">
              <div className="hidden items-center gap-2 lg:flex">
                <Label htmlFor="rows-per-page" className="text-sm font-medium">
                  Rows per page
                </Label>
                <Select
                  value={`${table.getState().pagination.pageSize}`}
                  onValueChange={(value) => table.setPageSize(Number(value))}
                >
                  <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                    <SelectValue placeholder={table.getState().pagination.pageSize} />
                  </SelectTrigger>
                  <SelectContent side="top">
                    <SelectGroup>
                      {[10, 20, 30, 40, 50].map((pageSize) => (
                        <SelectItem key={pageSize} value={`${pageSize}`}>
                          {pageSize}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex w-fit items-center justify-center text-sm font-medium">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </div>
              <div className="ml-auto flex items-center gap-2 lg:ml-0">
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Go to first page</span>
                  <ChevronsLeftIcon />
                </Button>
                <Button
                  variant="outline"
                  className="size-8"
                  size="icon"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Go to previous page</span>
                  <ChevronLeftIcon />
                </Button>
                <Button
                  variant="outline"
                  className="size-8"
                  size="icon"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Go to next page</span>
                  <ChevronRightIcon />
                </Button>
                <Button
                  variant="outline"
                  className="hidden size-8 lg:flex"
                  size="icon"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Go to last page</span>
                  <ChevronsRightIcon />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </>
  )
}

const chartData = [{ month: "January", desktop: 186, mobile: 80 }]

const chartConfig = {
  desktop: { label: "Desktop", color: "var(--primary)" },
  mobile: { label: "Mobile", color: "var(--primary)" },
} satisfies ChartConfig

interface TableCellViewerProps {
  item: Lead
  openTriggerRef: (openFn: () => void) => void
}

function TableCellViewer({ item, openTriggerRef }: TableCellViewerProps) {
  const isMobile = useIsMobile()
  const [open, setOpen] = React.useState(false)
  const [leadItem, setLeadItem] = React.useState(item)
  const [assignees, setAssignees] = React.useState<Assignee[]>([])

  React.useEffect(() => {
    setLeadItem(item)
  }, [item])

  React.useEffect(() => {
    openTriggerRef(() => setOpen(true))
  }, [openTriggerRef])

  // Fetch assignees roster specifically for the sliding drawer panel forms
  React.useEffect(() => {
    async function fetchDrawerAssignees() {
      const { data: team } = await supabase
        .from("assignees")
        .select("id, name")
        .order("name", { ascending: true })
      if (team) setAssignees(team)
    }
    if (open) fetchDrawerAssignees()
  }, [open])

  return (
    <Drawer direction={isMobile ? "bottom" : "right"} open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="link" className="w-fit px-0 text-left text-foreground font-medium hover:no-underline">
          {leadItem.lead}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{leadItem.lead}</DrawerTitle>
          <DrawerDescription>Lead details reference profile</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          <form 
            className="flex flex-col gap-4"
            onSubmit={async (e) => {
              e.preventDefault()
              const updateAction = updateLeadField(leadItem.id, {
                lead: leadItem.lead,
                business_name: leadItem.business_name || null,
                phone: leadItem.phone || null,
                assignee_id: leadItem.assignee_id === "unassigned" ? null : leadItem.assignee_id,
                service: leadItem.service,
                status: leadItem.status
              })
              toast.promise(updateAction, {
                loading: "Saving card updates...",
                success: "Profile updated successfully",
                error: "Failed to persist profile modifications"
              })
            }}
          >
            <div className="flex flex-col gap-3">
              <Label htmlFor="header">Lead</Label>
              <Input 
                id="header" 
                value={leadItem.lead} 
                onChange={(e) => setLeadItem(p => ({ ...p, lead: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="service">Service</Label>
                <Select 
                  value={leadItem.service}
                  onValueChange={(val) => setLeadItem(p => ({ ...p, service: val }))}
                >
                  <SelectTrigger id="service" className="w-full">
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="Sales Funnel">Sales Funnel</SelectItem>
                      <SelectItem value="Lead Generation">Lead Generation</SelectItem>
                      <SelectItem value="Automation">Automation</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={leadItem.status}
                  onValueChange={(val) => setLeadItem(p => ({ ...p, status: val }))}
                >
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="Done">Done</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Not Started">Not Started</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="business_name">Business Name</Label>
                <Input 
                  id="business_name" 
                  value={leadItem.business_name} 
                  onChange={(e) => setLeadItem(p => ({ ...p, business_name: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="phone">Phone</Label>
                <Input 
                  id="phone" 
                  value={leadItem.phone} 
                  onChange={(e) => setLeadItem(p => ({ ...p, phone: e.target.value }))}
                />
              </div>
            </div>

            {/* Added Assignee Management Input Option inside Drawer profile editor panel */}
            <div className="flex flex-col gap-3">
              <Label htmlFor="drawer-assignee">Assignee Profile Allocation</Label>
              <Select
                value={leadItem.assignee_id || "unassigned"}
                onValueChange={(val) => setLeadItem(p => ({ ...p, assignee_id: val === "unassigned" ? "" : val }))}
              >
                <SelectTrigger id="drawer-assignee" className="w-full">
                  <SelectValue placeholder="Assign team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {assignees.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            
            <Button type="submit" className="mt-2 w-full">Save Changes</Button>
          </form>
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Close Workspace</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
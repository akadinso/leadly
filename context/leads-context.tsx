"use client"

import * as React from "react"

interface LeadsContextType {
  addLeadOpen: boolean
  setAddLeadOpen: (open: boolean) => void
}

const LeadsContext = React.createContext<LeadsContextType | null>(null)

export function LeadsProvider({ children }: { children: React.ReactNode }) {
  const [addLeadOpen, setAddLeadOpen] = React.useState(false)

  return (
    <LeadsContext.Provider value={{ addLeadOpen, setAddLeadOpen }}>
      {children}
    </LeadsContext.Provider>
  )
}

export function useLeads() {
  const ctx = React.useContext(LeadsContext)
  if (!ctx) throw new Error("useLeads must be used inside LeadsProvider")
  return ctx
}

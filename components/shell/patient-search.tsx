"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { DEMO_PATIENTEN } from "@/lib/types"
import type { PatientContext, ReturnTo } from "@/lib/types"
import { Search, User } from "lucide-react"

interface PatientSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (patient: PatientContext, from?: ReturnTo) => void
}

export function PatientSearch({ open, onOpenChange, onSelect }: PatientSearchProps) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    if (!query.trim()) return DEMO_PATIENTEN
    const q = query.toLowerCase()
    return DEMO_PATIENTEN.filter(
      p => p.name.toLowerCase().includes(q) ||
        p.patientId.toLowerCase().includes(q) ||
        p.faelle.some(f => f.fallNummer.toLowerCase().includes(q))
    )
  }, [query])

  const handleSelect = (p: typeof DEMO_PATIENTEN[number]) => {
    const aktiverFall = p.faelle.find(f => !f.entlassung) ?? p.faelle[0]
    onSelect({
      patientId: p.patientId,
      name: p.name,
      geburtsdatum: p.geburtsdatum,
      geschlecht: p.geschlecht,
      station: p.station,
      faelle: p.faelle,
      aktiverFall,
    })
    setQuery("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Patient suchen</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Name, Patienten-ID oder Fallnummer..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>
        <div className="max-h-64 overflow-y-auto -mx-1">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Keine Patienten gefunden.
            </p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {filtered.map(p => {
                const aktiverFall = p.faelle.find(f => !f.entlassung) ?? p.faelle[0]
                return (
                  <button
                    key={p.patientId}
                    onClick={() => handleSelect(p)}
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-muted transition-colors"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.patientId} | {aktiverFall.fallNummer} | St. {p.station} Zi. {p.zimmer}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

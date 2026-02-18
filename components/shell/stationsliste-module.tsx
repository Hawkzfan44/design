"use client"

import { useState, useMemo, useEffect } from "react"
import { useShell } from "@/lib/shell-context"
import { DEMO_PATIENTEN, PATIENTEN_MODULE } from "@/lib/types"
import type { PatientContext, StationsPatient } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, User, ExternalLink, ChevronRight, Pin } from "lucide-react"

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function StationslisteModule() {
  const { openPatient, setStationPatients, setActiveModule, pinPatientFromStation, unpinPatient, isPatientPinned } = useShell()

  const [search, setSearch] = useState("")
  const [stationFilter, setStationFilter] = useState("alle")

  // All unique stations
  const stations = useMemo(() => {
    const set = new Set(DEMO_PATIENTEN.map(p => p.station))
    return Array.from(set).sort()
  }, [])

  // Filtered patients
  const filtered = useMemo(() => {
    let list = DEMO_PATIENTEN
    if (stationFilter !== "alle") {
      list = list.filter(p => p.station === stationFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.patientId.toLowerCase().includes(q) ||
        p.zimmer.toLowerCase().includes(q)
      )
    }
    return list
  }, [search, stationFilter])

  // Update station patients in context when filter changes
  useEffect(() => {
    const stationList = stationFilter !== "alle"
      ? DEMO_PATIENTEN.filter(p => p.station === stationFilter)
      : DEMO_PATIENTEN
    setStationPatients(stationList)
  }, [stationFilter, setStationPatients])

  // Open patient from station list
  const handleOpen = (sp: StationsPatient, targetModule?: string) => {
    const aktiverFall = sp.faelle.find(f => !f.entlassung) ?? sp.faelle[0]
    const ctx: PatientContext = {
      patientId: sp.patientId,
      name: sp.name,
      geburtsdatum: sp.geburtsdatum,
      geschlecht: sp.geschlecht,
      station: sp.station,
      faelle: sp.faelle,
      aktiverFall,
    }
    openPatient(ctx, { moduleId: "stationsliste", label: "Stationsliste" })
    if (targetModule) {
      // Small delay to let view mode switch first
      setTimeout(() => setActiveModule(targetModule), 0)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Patient suchen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={stationFilter} onValueChange={setStationFilter}>
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue placeholder="Station" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Stationen</SelectItem>
            {stations.map(s => (
              <SelectItem key={s} value={s}>Station {s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {filtered.length} Patient{filtered.length !== 1 ? "en" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
            <tr className="text-left text-xs font-medium text-muted-foreground">
              <th className="px-4 py-2">Patient</th>
              <th className="px-4 py-2 hidden sm:table-cell">Geb.</th>
              <th className="px-4 py-2">Station</th>
              <th className="px-4 py-2 hidden md:table-cell">Zimmer</th>
              <th className="px-4 py-2 hidden lg:table-cell">Aktiver Fall</th>
              <th className="px-4 py-2 hidden lg:table-cell">Fachabteilung</th>
              <th className="px-4 py-2 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(p => {
              const aktiverFall = p.faelle.find(f => !f.entlassung) ?? p.faelle[0]
              return (
                <tr
                  key={p.patientId}
                  className="hover:bg-muted/40 transition-colors cursor-pointer group"
                  onClick={() => handleOpen(p)}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate" title={p.name}>{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.patientId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground text-xs">
                    {formatDate(p.geburtsdatum)}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="secondary" className="text-xs">{p.station}</Badge>
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground text-xs">
                    {p.zimmer}
                  </td>
                  <td className="px-4 py-2.5 hidden lg:table-cell text-xs text-muted-foreground">
                    {aktiverFall.fallNummer}
                  </td>
                  <td className="px-4 py-2.5 hidden lg:table-cell text-xs text-muted-foreground">
                    {aktiverFall.fachabteilung}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Pin toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (isPatientPinned(p.patientId)) {
                            unpinPatient(p.patientId)
                          } else {
                            pinPatientFromStation(p)
                          }
                        }}
                        className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                          isPatientPinned(p.patientId)
                            ? "text-mh-blau"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                        title={isPatientPinned(p.patientId) ? "Nicht mehr anpinnen" : "Anpinnen"}
                      >
                        <Pin className="h-3.5 w-3.5" />
                      </button>

                      {/* Direct open */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpen(p); }}
                        className="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Patient oeffnen"
                      >
                        <span className="hidden xl:inline">Oeffnen</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>

                      {/* Module dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={e => e.stopPropagation()}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="Modul waehlen"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {PATIENTEN_MODULE.map(mod => (
                            <DropdownMenuItem
                              key={mod.id}
                              onClick={() => handleOpen(p, mod.id)}
                              className="text-xs"
                            >
                              {mod.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <User className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">Keine Patienten gefunden.</p>
          </div>
        )}
      </div>
    </div>
  )
}

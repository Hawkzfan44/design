"use client"

import { useState } from "react"
import { useShell } from "@/lib/shell-context"
import { ARBEITSLISTEN_MODULE, PATIENTEN_MODULE } from "@/lib/types"
import type { Fall } from "@/lib/types"
import {
  Menu, X,
  BedDouble, PackageCheck, Receipt, ClipboardList,
  Pill, Activity, Stethoscope, FileText,
  ChevronLeft, ChevronRight, Search,
  ListTodo, UserRound, ChevronsUpDown,
  Pin, IterationCcw,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "bed-double": BedDouble,
  "package-check": PackageCheck,
  "receipt": Receipt,
  "clipboard-list": ClipboardList,
  "pill": Pill,
  "activity": Activity,
  "stethoscope": Stethoscope,
  "file-text": FileText,
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function MobileNav() {
  const {
    viewMode, setViewMode,
    activeModule, setActiveModule,
    patient, navigatePatient, patientIndex,
    stationPatients,
    setPatientFall,
    setPatientSearchOpen,
    pinnedPatients, openPinnedPatient, unpinPatient,
    parkedChain, returnToChain,
  } = useShell()

  const [open, setOpen] = useState(false)
  const [showFaelle, setShowFaelle] = useState(false)

  const handleModuleClick = (id: string) => {
    setActiveModule(id)
    setOpen(false)
  }

  // Group patient modules
  const groups: { label: string; modules: typeof PATIENTEN_MODULE }[] = []
  for (const mod of PATIENTEN_MODULE) {
    const g = mod.group ?? ""
    const existing = groups.find(gr => gr.label === g)
    if (existing) existing.modules.push(mod)
    else groups.push({ label: g, modules: [mod] })
  }

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-md text-topbar-foreground hover:bg-secondary transition-colors"
        aria-label="Navigation öffnen"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-navbar flex flex-col animate-in slide-in-from-left duration-200">
            {/* Header */}
            <div className="flex items-center h-12 px-3 border-b border-navbar-border shrink-0">
              <span className="text-sm font-bold text-navbar-active-foreground tracking-tight">Web KIS</span>
              <button
                onClick={() => setOpen(false)}
                className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-navbar-foreground hover:bg-navbar-hover transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Global Search */}
            <div className="px-3 pt-3 shrink-0">
              <button
                onClick={() => { setPatientSearchOpen(true); setOpen(false); }}
                className="flex items-center gap-2 w-full rounded-md bg-navbar-hover/60 px-2.5 py-2 text-xs text-navbar-foreground hover:bg-navbar-hover transition-colors"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Suche...</span>
              </button>
            </div>

            {/* Chain return */}
            {parkedChain && (
              <div className="px-3 pt-2 shrink-0">
                <button
                  onClick={() => { returnToChain(); setOpen(false); }}
                  className="flex items-center gap-1.5 w-full rounded-md px-2.5 py-2 text-xs font-medium bg-mh-blau/15 text-[var(--mh-grau)] hover:bg-mh-blau/25 border border-mh-blau/30 transition-colors"
                >
                  <IterationCcw className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate" title={`Stationsliste: ${parkedChain.patient.name}`}>
                    Stationsliste: {parkedChain.patient.name}
                  </span>
                </button>
              </div>
            )}

            {/* View Mode Toggle */}
            <div className="px-3 pt-2 pb-1 shrink-0">
              <div className="flex rounded-lg bg-navbar-hover/60 p-0.5">
                <button
                  onClick={() => setViewMode("listen")}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                    viewMode === "listen"
                      ? "bg-navbar-active text-navbar-active-foreground shadow-sm"
                      : "text-navbar-foreground"
                  }`}
                >
                  <ListTodo className="h-3.5 w-3.5" />
                  Listen
                </button>
                <button
                  onClick={() => setViewMode("patient")}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                    viewMode === "patient"
                      ? "bg-navbar-active text-navbar-active-foreground shadow-sm"
                      : "text-navbar-foreground"
                  }`}
                >
                  <UserRound className="h-3.5 w-3.5" />
                  Patient
                </button>
              </div>
            </div>

            {/* Patient Stepper (mobile) */}
            {viewMode === "patient" && patient && (
              <div className="px-3 pt-2 pb-1 shrink-0">
                <div className="rounded-lg bg-navbar-hover/40 px-2.5 py-2">
                  <button
                    onClick={() => { setPatientSearchOpen(true); setOpen(false); }}
                    className="flex items-center gap-1.5 w-full text-left group mb-1.5"
                  >
                    <span className="text-sm font-semibold text-navbar-active-foreground truncate flex-1" title={patient.name}>{patient.name}</span>
                    <Search className="h-3 w-3 text-navbar-section shrink-0" />
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigatePatient("prev")}
                      disabled={stationPatients.length <= 1}
                      className="flex h-6 w-6 items-center justify-center rounded text-navbar-foreground hover:bg-navbar-hover disabled:opacity-30"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-[11px] text-navbar-section flex-1 text-center">
                      St. {patient.station} | {patientIndex + 1} / {stationPatients.length}
                    </span>
                    <button
                      onClick={() => navigatePatient("next")}
                      disabled={stationPatients.length <= 1}
                      className="flex h-6 w-6 items-center justify-center rounded text-navbar-foreground hover:bg-navbar-hover disabled:opacity-30"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Fall */}
                  {patient.faelle.length > 1 ? (
                    <div className="mt-1.5">
                      <button
                        onClick={() => setShowFaelle(!showFaelle)}
                        className="flex items-center gap-1 w-full text-left rounded px-1 py-0.5 hover:bg-navbar-hover transition-colors"
                      >
                        <span className="text-[11px] text-navbar-foreground truncate flex-1">
                          {patient.aktiverFall.fallNummer} -- {patient.aktiverFall.fachabteilung}
                        </span>
                        <ChevronsUpDown className="h-3 w-3 text-navbar-section shrink-0" />
                      </button>
                      {showFaelle && (
                        <div className="mt-1 flex flex-col gap-0.5">
                          {patient.faelle.map(f => (
                            <button
                              key={f.fallNummer}
                              onClick={() => { setPatientFall(f); setShowFaelle(false); }}
                              className={`flex flex-col rounded px-2 py-1.5 text-left transition-colors ${
                                f.fallNummer === patient.aktiverFall.fallNummer ? "bg-navbar-hover" : "hover:bg-navbar-hover"
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium text-navbar-active-foreground">{f.fallNummer}</span>
                                <Badge variant={f.entlassung ? "secondary" : "default"} className={`text-[9px] h-3.5 ${!f.entlassung ? "bg-[var(--mh-rot)] text-[#fff]" : ""}`}>
                                  {f.entlassung ? "Abgeschl." : "Aktiv"}
                                </Badge>
                              </div>
                              <span className="text-[10px] text-navbar-section">
                                {f.fachabteilung} | {formatDate(f.aufnahme)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-navbar-section mt-1.5 px-1 truncate">
                      {patient.aktiverFall.fallNummer} -- {patient.aktiverFall.fachabteilung}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Module Links */}
            <nav className="flex-1 overflow-y-auto px-3 pt-2 pb-4">
              {viewMode === "listen" ? (
                <div className="flex flex-col gap-0.5">
                  {ARBEITSLISTEN_MODULE.map(mod => {
                    const Icon = ICONS[mod.icon]
                    const active = activeModule === mod.id
                    return (
                      <button
                        key={mod.id}
                        onClick={() => handleModuleClick(mod.id)}
                        className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
                          active
                            ? "bg-navbar-active text-navbar-active-foreground font-medium"
                            : "text-navbar-foreground hover:bg-navbar-hover hover:text-navbar-active-foreground"
                        }`}
                      >
                        {Icon && <Icon className="h-4 w-4 shrink-0" />}
                        <span>{mod.label}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {groups.map(group => (
                    <div key={group.label}>
                      {group.label && (
                        <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-navbar-section">
                          {group.label}
                        </p>
                      )}
                      <div className="flex flex-col gap-0.5">
                        {group.modules.map(mod => {
                          const Icon = ICONS[mod.icon]
                          const active = activeModule === mod.id
                          return (
                            <button
                              key={mod.id}
                              onClick={() => handleModuleClick(mod.id)}
                              className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
                                active
                                  ? "bg-navbar-active text-navbar-active-foreground font-medium"
                                  : "text-navbar-foreground hover:bg-navbar-hover hover:text-navbar-active-foreground"
                              }`}
                            >
                              {Icon && <Icon className="h-4 w-4 shrink-0" />}
                              <span>{mod.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </nav>

            {/* Pinned Patients (bottom) */}
            {pinnedPatients.length > 0 && (
              <div className="border-t border-navbar-border px-3 py-2 shrink-0">
                <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-navbar-section flex items-center gap-1">
                  <Pin className="h-3 w-3" />
                  Angepinnt
                </p>
                <div className="flex flex-col gap-0.5 max-h-28 overflow-y-auto">
                  {pinnedPatients.map(pp => {
                    const isCurrent = patient?.patientId === pp.patient.patientId
                    return (
                      <div key={pp.patient.patientId} className="flex items-center gap-0.5 group">
                        <button
                          onClick={() => { openPinnedPatient(pp.patient.patientId); setOpen(false); }}
                          className={`flex-1 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors truncate min-w-0 ${
                            isCurrent
                              ? "bg-navbar-active text-navbar-active-foreground font-medium"
                              : "text-navbar-foreground hover:bg-navbar-hover"
                          }`}
                        >
                          <UserRound className="h-3 w-3 shrink-0" />
                          <span className="truncate" title={pp.patient.name}>{pp.patient.name}</span>
                        </button>
                        <button
                          onClick={() => unpinPatient(pp.patient.patientId)}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-navbar-section hover:text-navbar-active-foreground hover:bg-navbar-hover"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

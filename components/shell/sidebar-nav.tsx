"use client"

import { useMemo, useState, useRef } from "react"
import { useShell } from "@/lib/shell-context"
import { ARBEITSLISTEN_MODULE, PATIENTEN_MODULE } from "@/lib/types"
import type { PatientContext, PinnedPatient } from "@/lib/types"
import {
  PanelLeftClose, PanelLeftOpen,
  BedDouble, PackageCheck, Receipt, ClipboardList,
  Pill, Activity, Stethoscope, FileText,
  ChevronLeft, ChevronRight, Search, ChevronsUpDown,
  ListTodo, UserRound, Pin, X, GripVertical,
} from "lucide-react"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

// Icon resolver
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

export function SidebarNav() {
  const {
    viewMode, setViewMode,
    activeModule, setActiveModule,
    collapsed, toggleCollapsed,
    patient, navigatePatient, patientIndex,
    stationPatients,
    setPatientFall,
    setPatientSearchOpen,
    pinnedPatients, pinPatient, unpinPatient, openPinnedPatient, isPatientPinned, reorderPinnedPatients,
  } = useShell()

  // Group patient modules
  const groupedPatientModules = useMemo(() => {
    const groups: { label: string; modules: typeof PATIENTEN_MODULE }[] = []
    for (const mod of PATIENTEN_MODULE) {
      const g = mod.group ?? ""
      const existing = groups.find(gr => gr.label === g)
      if (existing) existing.modules.push(mod)
      else groups.push({ label: g, modules: [mod] })
    }
    return groups
  }, [])

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={`
          hidden md:flex flex-col h-full bg-navbar border-r border-navbar-border
          transition-[width] duration-200 ease-in-out shrink-0
          ${collapsed ? "w-16" : "w-60"}
        `}
      >
        {/* ── Header: Logo + Collapse ─────────────────── */}
        <div className="flex items-center h-12 px-3 gap-2 border-b border-navbar-border shrink-0">
          {!collapsed && (
            <span className="text-sm font-bold text-navbar-active-foreground tracking-tight select-none">
              Web KIS
            </span>
          )}
          <div className={collapsed ? "mx-auto" : "ml-auto"}>
            <button
              onClick={toggleCollapsed}
              className="flex h-7 w-7 items-center justify-center rounded-md text-navbar-foreground hover:bg-navbar-hover transition-colors"
              aria-label={collapsed ? "Navigation ausklappen" : "Navigation einklappen"}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* ── View Mode Toggle ────────────────────────── */}
        <div className="px-2 pt-3 pb-1 shrink-0">
          {collapsed ? (
            <div className="flex flex-col items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setViewMode("listen")}
                    className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                      viewMode === "listen"
                        ? "bg-navbar-active text-navbar-active-foreground"
                        : "text-navbar-foreground hover:bg-navbar-hover"
                    }`}
                  >
                    <ListTodo className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Arbeitslisten</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setViewMode("patient")}
                    className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                      viewMode === "patient"
                        ? "bg-navbar-active text-navbar-active-foreground"
                        : "text-navbar-foreground hover:bg-navbar-hover"
                    }`}
                  >
                    <UserRound className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Patient</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="flex rounded-lg bg-navbar-hover/60 p-0.5">
              <button
                onClick={() => setViewMode("listen")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "listen"
                    ? "bg-navbar-active text-navbar-active-foreground shadow-sm"
                    : "text-navbar-foreground hover:text-navbar-active-foreground"
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
                    : "text-navbar-foreground hover:text-navbar-active-foreground"
                }`}
              >
                <UserRound className="h-3.5 w-3.5" />
                Patient
              </button>
            </div>
          )}
        </div>

        {/* ── Patient Stepper (only in patient mode, expanded) ── */}
        {viewMode === "patient" && patient && !collapsed && (
          <div className="px-2 pt-2 pb-1 shrink-0">
            <div className="rounded-lg bg-navbar-hover/40 px-2.5 py-2">
              {/* Patient name + pin */}
              <div className="flex items-center gap-1 mb-1.5">
                <button
                  onClick={() => setPatientSearchOpen(true)}
                  className="flex items-center gap-1.5 flex-1 min-w-0 text-left group"
                >
                  <span className="text-sm font-semibold text-navbar-active-foreground truncate flex-1" title={patient.name}>
                    {patient.name}
                  </span>
                  <Search className="h-3 w-3 text-navbar-section opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        if (isPatientPinned(patient.patientId)) {
                          unpinPatient(patient.patientId)
                        } else {
                          pinPatient(patient)
                        }
                      }}
                      className={`flex h-5 w-5 items-center justify-center rounded shrink-0 transition-colors ${
                        isPatientPinned(patient.patientId)
                          ? "text-mh-blau"
                          : "text-navbar-section hover:text-navbar-active-foreground"
                      }`}
                    >
                      <Pin className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {isPatientPinned(patient.patientId) ? "Nicht mehr anpinnen" : "Patient anpinnen"}
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Stepper row */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigatePatient("prev")}
                  disabled={stationPatients.length <= 1}
                  className="flex h-6 w-6 items-center justify-center rounded text-navbar-foreground hover:bg-navbar-hover disabled:opacity-30 transition-colors shrink-0"
                  aria-label="Vorheriger Patient"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-[11px] text-navbar-section flex-1 text-center">
                  St. {patient.station} | {patientIndex + 1} / {stationPatients.length}
                </span>
                <button
                  onClick={() => navigatePatient("next")}
                  disabled={stationPatients.length <= 1}
                  className="flex h-6 w-6 items-center justify-center rounded text-navbar-foreground hover:bg-navbar-hover disabled:opacity-30 transition-colors shrink-0"
                  aria-label="Naechster Patient"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Fall picker */}
              {patient.faelle.length > 1 ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1 mt-1.5 w-full text-left rounded px-1 py-0.5 hover:bg-navbar-hover transition-colors">
                      <span className="text-[11px] text-navbar-foreground truncate flex-1">
                        {patient.aktiverFall.fallNummer} -- {patient.aktiverFall.fachabteilung}
                      </span>
                      <ChevronsUpDown className="h-3 w-3 text-navbar-section shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="right" align="start" className="w-72 p-1">
                    <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Faelle von {patient.name}</p>
                    {patient.faelle.map(f => (
                      <button
                        key={f.fallNummer}
                        onClick={() => setPatientFall(f)}
                        className={`flex flex-col w-full rounded-md px-2 py-1.5 text-left transition-colors ${
                          f.fallNummer === patient.aktiverFall.fallNummer ? "bg-muted" : "hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{f.fallNummer}</span>
                          <Badge variant={f.entlassung ? "secondary" : "default"} className={`text-[10px] h-4 ${!f.entlassung ? "bg-[var(--mh-rot)] text-[#fff]" : ""}`}>
                            {f.entlassung ? "Abgeschlossen" : "Aktiv"}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {f.fachabteilung} | {f.fallArt} | {formatDate(f.aufnahme)}{f.entlassung ? ` - ${formatDate(f.entlassung)}` : ""}
                        </span>
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              ) : (
                <p className="text-[11px] text-navbar-section mt-1.5 px-1 truncate">
                  {patient.aktiverFall.fallNummer} -- {patient.aktiverFall.fachabteilung}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Collapsed patient stepper */}
        {viewMode === "patient" && patient && collapsed && (
          <div className="flex flex-col items-center gap-1 px-1 pt-2 pb-1 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigatePatient("prev")}
                  disabled={stationPatients.length <= 1}
                  className="flex h-7 w-7 items-center justify-center rounded text-navbar-foreground hover:bg-navbar-hover disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Vorheriger Patient</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setPatientSearchOpen(true)}
                  className="flex h-7 w-7 items-center justify-center rounded text-navbar-foreground hover:bg-navbar-hover transition-colors"
                >
                  <Search className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{patient.name}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigatePatient("next")}
                  disabled={stationPatients.length <= 1}
                  className="flex h-7 w-7 items-center justify-center rounded text-navbar-foreground hover:bg-navbar-hover disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Naechster Patient</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* ── Module Links ────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-2 pt-2 pb-3">
          {viewMode === "listen" ? (
            <div className="flex flex-col gap-0.5">
              {ARBEITSLISTEN_MODULE.map(mod => {
                const Icon = ICONS[mod.icon]
                const active = activeModule === mod.id
                return collapsed ? (
                  <Tooltip key={mod.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setActiveModule(mod.id)}
                        className={`flex h-9 w-full items-center justify-center rounded-md transition-colors ${
                          active
                            ? "bg-navbar-active text-navbar-active-foreground"
                            : "text-navbar-foreground hover:bg-navbar-hover hover:text-navbar-active-foreground"
                        }`}
                      >
                        {Icon && <Icon className="h-4 w-4" />}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{mod.label}</TooltipContent>
                  </Tooltip>
                ) : (
                  <button
                    key={mod.id}
                    onClick={() => setActiveModule(mod.id)}
                    className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
                      active
                        ? "bg-navbar-active text-navbar-active-foreground font-medium"
                        : "text-navbar-foreground hover:bg-navbar-hover hover:text-navbar-active-foreground"
                    }`}
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0" />}
                    <span className="truncate">{mod.label}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {groupedPatientModules.map(group => (
                <div key={group.label}>
                  {!collapsed && group.label && (
                    <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-navbar-section">
                      {group.label}
                    </p>
                  )}
                  {collapsed && group.label && (
                    <div className="mx-auto mb-1 h-px w-6 bg-navbar-border" />
                  )}
                  <div className="flex flex-col gap-0.5">
                    {group.modules.map(mod => {
                      const Icon = ICONS[mod.icon]
                      const active = activeModule === mod.id
                      return collapsed ? (
                        <Tooltip key={mod.id}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setActiveModule(mod.id)}
                              className={`flex h-9 w-full items-center justify-center rounded-md transition-colors ${
                                active
                                  ? "bg-navbar-active text-navbar-active-foreground"
                                  : "text-navbar-foreground hover:bg-navbar-hover hover:text-navbar-active-foreground"
                              }`}
                            >
                              {Icon && <Icon className="h-4 w-4" />}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right">{mod.label}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <button
                          key={mod.id}
                          onClick={() => setActiveModule(mod.id)}
                          className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
                            active
                              ? "bg-navbar-active text-navbar-active-foreground font-medium"
                              : "text-navbar-foreground hover:bg-navbar-hover hover:text-navbar-active-foreground"
                          }`}
                        >
                          {Icon && <Icon className="h-4 w-4 shrink-0" />}
                          <span className="truncate">{mod.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </nav>

        {/* ── Pinned Patients (bottom, drag-and-drop) ── */}
        <PinnedPatientsSection
          pinnedPatients={pinnedPatients}
          patient={patient}
          collapsed={collapsed}
          openPinnedPatient={openPinnedPatient}
          unpinPatient={unpinPatient}
          reorderPinnedPatients={reorderPinnedPatients}
        />
      </aside>
    </TooltipProvider>
  )
}

// ── Pinned Patients with Drag-and-Drop ──────────────────
function PinnedPatientsSection({
  pinnedPatients,
  patient,
  collapsed,
  openPinnedPatient,
  unpinPatient,
  reorderPinnedPatients,
}: {
  pinnedPatients: PinnedPatient[]
  patient: PatientContext | null
  collapsed: boolean
  openPinnedPatient: (id: string) => void
  unpinPatient: (id: string) => void
  reorderPinnedPatients: (from: number, to: number) => void
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  // dropTarget stores the insertion position: "before 2" = insert line above index 2
  const [dropTarget, setDropTarget] = useState<{ index: number; position: "before" | "after" } | null>(null)

  if (pinnedPatients.length === 0) return null

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", String(index))
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    // Determine if cursor is in the top or bottom half of the element
    const rect = e.currentTarget.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const position = e.clientY < midY ? "before" : "after"
    setDropTarget({ index, position })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (dragIndex === null || !dropTarget) { setDragIndex(null); setDropTarget(null); return }
    // Calculate the actual insert index
    let toIndex = dropTarget.position === "before" ? dropTarget.index : dropTarget.index + 1
    // Adjust if dragging from before the insert point
    if (dragIndex < toIndex) toIndex -= 1
    if (dragIndex !== toIndex && toIndex >= 0 && toIndex < pinnedPatients.length) {
      reorderPinnedPatients(dragIndex, toIndex)
    }
    setDragIndex(null)
    setDropTarget(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setDropTarget(null)
  }

  // Determine if an insertion line should show before/after a given index
  const showLineBefore = (index: number) =>
    dropTarget && dropTarget.index === index && dropTarget.position === "before" && dragIndex !== index && dragIndex !== index - 1
  const showLineAfter = (index: number) =>
    dropTarget && dropTarget.index === index && dropTarget.position === "after" && dragIndex !== index && dragIndex !== index + 1

  return (
    <div className="border-t border-navbar-border px-2 py-2 shrink-0">
      {!collapsed ? (
        <>
          <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-navbar-section flex items-center gap-1">
            <Pin className="h-3 w-3" />
            Angepinnt
          </p>
          <div className="flex flex-col max-h-36 overflow-y-auto" onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
            {pinnedPatients.map((pp, index) => {
              const isCurrent = patient?.patientId === pp.patient.patientId
              const isDragging = dragIndex === index
              return (
                <div key={pp.patient.patientId} className="relative">
                  {/* Insertion line BEFORE */}
                  {showLineBefore(index) && (
                    <div className="absolute top-0 left-2 right-2 h-0.5 bg-mh-blau rounded-full z-10" />
                  )}
                  <div
                    draggable
                    onDragStart={e => handleDragStart(e, index)}
                    onDragOver={e => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-0.5 group rounded-md transition-opacity ${isDragging ? "opacity-30" : ""}`}
                  >
                    <div className="flex h-6 w-4 shrink-0 items-center justify-center cursor-grab active:cursor-grabbing text-navbar-section opacity-0 group-hover:opacity-60 transition-opacity">
                      <GripVertical className="h-3 w-3" />
                    </div>
                    <button
                      onClick={() => openPinnedPatient(pp.patient.patientId)}
                      title={pp.patient.name}
                      className={`flex-1 flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-xs transition-colors truncate min-w-0 ${
                        isCurrent
                          ? "bg-navbar-active text-navbar-active-foreground font-medium"
                          : "text-navbar-foreground hover:bg-navbar-hover"
                      }`}
                    >
                      <UserRound className="h-3 w-3 shrink-0" />
                      <span className="truncate">{pp.patient.name}</span>
                    </button>
                    <button
                      onClick={() => unpinPatient(pp.patient.patientId)}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-navbar-section opacity-0 group-hover:opacity-100 hover:text-navbar-active-foreground hover:bg-navbar-hover transition-all"
                      title="Entfernen"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  {/* Insertion line AFTER */}
                  {showLineAfter(index) && (
                    <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-mh-blau rounded-full z-10" />
                  )}
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-1">
          {pinnedPatients.map(pp => {
            const isCurrent = patient?.patientId === pp.patient.patientId
            return (
              <Tooltip key={pp.patient.patientId}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => openPinnedPatient(pp.patient.patientId)}
                    className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                      isCurrent
                        ? "bg-navbar-active text-navbar-active-foreground"
                        : "text-navbar-foreground hover:bg-navbar-hover"
                    }`}
                  >
                    <UserRound className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{pp.patient.name}</TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      )}
    </div>
  )
}

"use client"

import { useMemo, useState, useRef, useEffect, useCallback } from "react"
import { useShell } from "@/lib/shell-context"
import { FAP_TYPEN } from "@/lib/shell-context"
import type { FapType } from "@/lib/shell-context"
import { ARBEITSLISTEN_MODULE, PATIENTEN_MODULE } from "@/lib/types"
import type { PatientContext, PinnedPatient } from "@/lib/types"
import {
  PanelLeftClose, PanelLeftOpen,
  BedDouble, PackageCheck, Receipt, ClipboardList,
  Pill, Activity, Stethoscope, FileText,
  ChevronLeft, ChevronRight, Search, ChevronsUpDown,
  ListTodo, UserRound, Pin, X, GripVertical,
  Scissors, Phone, Plus, ChevronDown, ChevronUp,
  MapPin,
} from "lucide-react"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

// ── Icon resolver ────────────────────────────────────────
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

// ── FAP-dependent module definitions ────────────────────
interface ModuleItem { id: string; label: string; icon: string; group: string }

const MODULES_NO_FAP: ModuleItem[] = [
  { id: "verordnungen",    label: "Verordnungen",  icon: "pill",           group: "Falluebersicht" },
  { id: "kurve",           label: "Kurve",          icon: "activity",       group: "Falluebersicht" },
  { id: "diagnosen",       label: "Diagnosen",      icon: "stethoscope",    group: "Falluebersicht" },
  { id: "dokumentation",   label: "Dokumentation",  icon: "file-text",      group: "Falluebersicht" },
  { id: "abrechnung-patient", label: "Abrechnung", icon: "receipt",         group: "Administration" },
]

const MODULES_OP: ModuleItem[] = [
  { id: "op-basisdaten",   label: "Basisdaten",          icon: "file-text",      group: "Vorbereitung" },
  { id: "op-diagnosen",    label: "Diagnosen/Therapien",  icon: "stethoscope",    group: "Vorbereitung" },
  { id: "op-zk-praeop",    label: "ZK präoperativ",       icon: "clipboard-list", group: "Vorbereitung" },
  { id: "op-personal",     label: "Personal",             icon: "clipboard-list", group: "Durchführung" },
  { id: "op-pflegedoku",   label: "Pflegedokumentation",  icon: "file-text",      group: "Durchführung" },
  { id: "op-arztdoku",     label: "Arztdokumentation",    icon: "file-text",      group: "Durchführung" },
  { id: "op-material",     label: "Material",             icon: "package-check",  group: "Durchführung" },
  { id: "op-leistungen",   label: "Leistungen",           icon: "receipt",        group: "Durchführung" },
  { id: "op-medikamente",  label: "Medikamente",          icon: "pill",           group: "Durchführung" },
  { id: "op-zk-postop",    label: "ZK postoperativ",      icon: "clipboard-list", group: "Abschluss" },
  { id: "op-bericht",      label: "OP-Bericht",           icon: "file-text",      group: "Abschluss" },
  { id: "op-dokumente",    label: "Dokumente",            icon: "file-text",      group: "Abschluss" },
  { id: "op-anordnungen",  label: "Anordnungen",          icon: "clipboard-list", group: "Abschluss" },
  { id: "abrechnung-patient", label: "Abrechnung",        icon: "receipt",        group: "Administration" },
]

const MODULES_AMBULANZ: ModuleItem[] = [
  { id: "verordnungen",  label: "Verordnungen", icon: "pill",        group: "Falluebersicht" },
  { id: "diagnosen",     label: "Diagnosen",    icon: "stethoscope", group: "Falluebersicht" },
  { id: "dokumentation", label: "Dokumentation",icon: "file-text",   group: "Falluebersicht" },
  { id: "befunde",       label: "Befunde",      icon: "activity",    group: "Falluebersicht" },
  { id: "abrechnung-patient", label: "Abrechnung", icon: "receipt",  group: "Administration" },
]

function getPatientModulesForFapType(type: FapType): ModuleItem[] {
  if (type === "op")       return MODULES_OP
  if (type === "ambulanz") return MODULES_AMBULANZ
  return MODULES_NO_FAP
}

// ── FAP-dependent Arbeitslisten ──────────────────────────
const LISTEN_OP_DEFS = [
  { id: "op-liste",    label: "OP-Liste",     icon: "bed-double" },
  { id: "aufgaben-op", label: "Aufgaben",     icon: "clipboard-list" },
  { id: "checklisten", label: "Checklisten",  icon: "package-check" },
  { id: "saalbelegung",label: "Saalbelegung", icon: "activity" },
]
const LISTEN_AMBULANZ_DEFS = [
  { id: "terminliste",      label: "Terminliste", icon: "clipboard-list" },
  { id: "warteliste",       label: "Warteliste",  icon: "bed-double" },
  { id: "aufgaben-ambulanz",label: "Aufgaben",    icon: "clipboard-list" },
]
const LISTEN_MRT_DEFS = [
  { id: "untersuchungsliste", label: "Untersuchungsliste", icon: "bed-double" },
  { id: "aufgaben-mrt",       label: "Aufgaben",           icon: "clipboard-list" },
]

function getListenForFapType(type: FapType): typeof ARBEITSLISTEN_MODULE {
  if (type === "op")        return LISTEN_OP_DEFS
  if (type === "ambulanz")  return LISTEN_AMBULANZ_DEFS
  if (type === "mrt")       return LISTEN_MRT_DEFS
  return ARBEITSLISTEN_MODULE
}

// ── Encounter definitions per FAP ───────────────────────
interface Encounter {
  id: string
  label: string
  labelLong: string
  iconType: "bed" | "scalpel" | "phone"
  metadata: string
  metadata2?: string
}

function getEncountersForFapType(type: FapType): Encounter[] {
  if (type === "op") return [
    { id: "eingriff-26-10", label: "Eingriff 26.10.", labelLong: "Eingriff 26.10.2023", iconType: "scalpel", metadata: "Gonarthrose · Dr. Müller", metadata2: "Saal 1" },
    { id: "eingriff-12-09", label: "Eingriff 12.09.", labelLong: "Eingriff 12.09.2023", iconType: "scalpel", metadata: "Schulter-TEP · Dr. Weber",  metadata2: "Saal 2" },
  ]
  if (type === "ambulanz") return [
    { id: "kontakt-1430",  label: "Kontakt heute 14:30",  labelLong: "Kontakt heute 14:30",       iconType: "phone", metadata: "Chirurgie · Zimmer 2" },
    { id: "kontakt-10-12", label: "Kontakt 10.12.",        labelLong: "Kontakt 10.12.2023",        iconType: "phone", metadata: "Chirurgie · Zimmer 2" },
  ]
  if (type === "endoskopie") return [
    { id: "untersuchung-heute", label: "Untersuchung heute 10:00", labelLong: "Untersuchung heute 10:00", iconType: "phone", metadata: "Koloskopie · Dr. Fischer · Raum 2" },
    { id: "untersuchung-05-12", label: "Untersuchung 05.12.",       labelLong: "Untersuchung 05.12.2023",  iconType: "phone", metadata: "Koloskopie · Dr. Fischer · Raum 2" },
  ]
  if (type === "mrt") return [
    { id: "untersuchung-mrt", label: "Untersuchung heute 09:30", labelLong: "Untersuchung heute 09:30", iconType: "phone", metadata: "MRT Knie · Gerät 1" },
  ]
  // default: station (no FAP)
  return [
    { id: "visite-heute",   label: "Visite heute 08:15",   labelLong: "Visite heute 08:15",   iconType: "bed", metadata: "Bett 302 · Station 3A · kein Ortswechsel" },
    { id: "visite-gestern", label: "Visite gestern 09:00", labelLong: "Visite gestern 09:00", iconType: "bed", metadata: "Bett 302 · Station 3A" },
  ]
}

function newEncounterLabel(type: FapType): string {
  if (type === "op")                          return "Neuen Eingriff anlegen"
  if (type === "ambulanz")                    return "Neuen Kontakt anlegen"
  if (type === "endoskopie" || type === "mrt") return "Neue Untersuchung anlegen"
  return "Neue Visite anlegen"
}

function newEncounterToast(type: FapType): string {
  if (type === "op")                          return "Neuer Eingriff wird angelegt..."
  if (type === "ambulanz")                    return "Neuer Kontakt wird angelegt..."
  if (type === "endoskopie" || type === "mrt") return "Neue Untersuchung wird angelegt..."
  return "Neue Visite wird angelegt..."
}

function sectionLabel(type: FapType): string {
  if (type === "op")                          return "Eingriff"
  if (type === "ambulanz")                    return "Kontakt"
  if (type === "endoskopie" || type === "mrt") return "Untersuchung"
  return "Visite"
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
}

// ── Main Component ───────────────────────────────────────
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
    activeFapType, setActiveFapType,
    activeFapUnit, setActiveFapUnit,
    activeEncounterIndex, setActiveEncounterIndex,
    user,
  } = useShell()

  const { toast } = useToast()

  // Dynamic modules based on FAP type
  const patientModules = useMemo(() => getPatientModulesForFapType(activeFapType), [activeFapType])
  const listenModules  = useMemo(() => getListenForFapType(activeFapType), [activeFapType])
  const encounters     = useMemo(() => getEncountersForFapType(activeFapType), [activeFapType])
  const activeFapTypeDef = useMemo(() => FAP_TYPEN.find(t => t.id === activeFapType), [activeFapType])

  // Reset encounter index when FAP type changes
  useEffect(() => {
    setActiveEncounterIndex(0)
  }, [activeFapType, setActiveEncounterIndex])

  // Set default unit when FAP type is selected without a unit
  useEffect(() => {
    if (activeFapType !== "none" && !activeFapUnit && activeFapTypeDef?.units.length) {
      setActiveFapUnit(activeFapTypeDef.units[0].id)
    }
  }, [activeFapType, activeFapUnit, activeFapTypeDef, setActiveFapUnit])

  // Group patient modules
  const groupedPatientModules = useMemo(() => {
    const groups: { label: string; modules: ModuleItem[] }[] = []
    for (const mod of patientModules) {
      const g = mod.group ?? ""
      const existing = groups.find(gr => gr.label === g)
      if (existing) existing.modules.push(mod)
      else groups.push({ label: g, modules: [mod] })
    }
    return groups
  }, [patientModules])

  const hasFap = activeFapType !== "none"

  // Station name for the "no FAP" label — derive from patient or user
  const stationName = patient?.station ? `Station ${patient.station}` : "Station 3A"

  // FAP display label for module section header
  const fapModuleLabel = useMemo(() => {
    if (!hasFap) return null
    const unit = activeFapTypeDef?.units.find(u => u.id === activeFapUnit)
    return unit ? unit.full.toUpperCase() : activeFapTypeDef?.label.toUpperCase() ?? ""
  }, [hasFap, activeFapTypeDef, activeFapUnit])

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={`
          hidden md:flex flex-col h-full bg-navbar border-r border-navbar-border
          transition-[width] duration-200 ease-in-out shrink-0
          ${collapsed ? "w-16" : "w-60"}
        `}
      >
        {/* ── Layer 0: Header: Logo + Collapse ─────────── */}
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

        {/* ── Layer 1: FAP Block ───────────────────────── */}
        {!collapsed && (
          <FapBlock
            activeFapType={activeFapType}
            setActiveFapType={setActiveFapType}
            activeFapUnit={activeFapUnit}
            setActiveFapUnit={setActiveFapUnit}
            stationName={stationName}
          />
        )}
        {collapsed && (
          <div className="flex flex-col items-center py-2 border-b border-navbar-border shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                    hasFap ? "text-[#0d9488] bg-[#0d9488]/15" : "text-navbar-section hover:bg-navbar-hover"
                  }`}
                  aria-label="Einsatzort"
                >
                  <MapPin className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Einsatzort: {activeFapTypeDef?.label ?? "Station"}</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* ── Layer 2: View Mode Toggle ────────────────── */}
        <div className="px-2 pt-3 pb-2 shrink-0 border-b border-navbar-border">
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

        {/* ── Layer 3: Patient Block ───────────────────── */}
        {viewMode === "patient" && patient && !collapsed && (
          <div className="px-2 pt-2 pb-0 shrink-0 border-b border-navbar-border">
            <div className="rounded-lg bg-navbar-hover/30 px-2.5 py-2 mb-2">
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
                        {patient.aktiverFall.fallNummer} — {patient.aktiverFall.fachabteilung}
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
                  {patient.aktiverFall.fallNummer} — {patient.aktiverFall.fachabteilung}
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

        {/* ── Layer 4: Encounter Block ─────────────────── */}
        {viewMode === "patient" && patient && !collapsed && (
          <div className="border-b border-navbar-border shrink-0">
            <div className="px-3 pt-2 pb-0.5">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-navbar-section">
                Klinisches Ereignis
              </p>
            </div>
            {activeFapType === "op" ? (
              <OpEncounterBlock
                activeEingriffIndex={activeEncounterIndex}
                setActiveEingriffIndex={setActiveEncounterIndex}
                onNew={() => toast({ description: newEncounterToast(activeFapType) })}
              />
            ) : (
              <EncounterSelector
                encounters={encounters}
                activeIndex={activeEncounterIndex}
                setActiveIndex={setActiveEncounterIndex}
                fapType={activeFapType}
                onNew={() => toast({ description: newEncounterToast(activeFapType) })}
              />
            )}
          </div>
        )}

        {/* ── Layer 5: Module Navigation ───────────────── */}
        <nav className={`flex-1 overflow-y-auto navbar-scroll px-2 pt-2 pb-3 ${hasFap ? "border-l-2 border-[#0d9488]" : ""}`}>
          {/* FAP context label */}
          {hasFap && !collapsed && viewMode === "patient" && fapModuleLabel && (
            <p className="px-2.5 pb-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#0d9488]/70">
              Module für: {fapModuleLabel}
            </p>
          )}

          {viewMode === "listen" ? (
            <div className="flex flex-col gap-0.5">
              {listenModules.map(mod => {
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
          ) : activeFapType === "op" ? (
            /* OP patient view: OP-Dokumentation + Eingriff sections */
            <div className="flex flex-col gap-3">
              {!collapsed && (
                <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-navbar-section">
                  OP-Dokumentation
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {MODULES_OP_LEVEL.map(mod => {
                  const Icon = ICONS[mod.icon]
                  const active = activeModule === mod.id
                  return collapsed ? (
                    <Tooltip key={mod.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setActiveModule(mod.id)}
                          className={`flex h-9 w-full items-center justify-center rounded-md transition-colors ${
                            active ? "bg-navbar-active text-navbar-active-foreground" : "text-navbar-foreground hover:bg-navbar-hover hover:text-navbar-active-foreground"
                          }`}
                        >
                          {Icon && <Icon className="h-4 w-4" />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">{mod.label}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <button key={mod.id} onClick={() => setActiveModule(mod.id)}
                      className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
                        active ? "bg-navbar-active text-navbar-active-foreground font-medium" : "text-navbar-foreground hover:bg-navbar-hover hover:text-navbar-active-foreground"
                      }`}
                    >
                      {Icon && <Icon className="h-4 w-4 shrink-0" />}
                      <span className="truncate">{mod.label}</span>
                    </button>
                  )
                })}
              </div>
              {!collapsed && (
                <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#0d9488]/80">
                  {`Eingriff: ${DEMO_EINGRIFFE[Math.min(activeEncounterIndex, DEMO_EINGRIFFE.length - 1)]?.label ?? ""}`}
                </p>
              )}
              {collapsed && <div className="mx-auto mb-1 h-px w-6 bg-navbar-border" />}
              <div className="flex flex-col gap-0.5">
                {MODULES_EINGRIFF.map(mod => {
                  const Icon = ICONS[mod.icon]
                  const active = activeModule === mod.id
                  return collapsed ? (
                    <Tooltip key={mod.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setActiveModule(mod.id)}
                          className={`flex h-9 w-full items-center justify-center rounded-md transition-colors ${
                            active ? "bg-navbar-active text-navbar-active-foreground" : "text-navbar-foreground hover:bg-navbar-hover hover:text-navbar-active-foreground"
                          }`}
                        >
                          {Icon && <Icon className="h-4 w-4" />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">{mod.label}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <button key={mod.id} onClick={() => setActiveModule(mod.id)}
                      className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
                        active ? "bg-navbar-active text-navbar-active-foreground font-medium" : "text-navbar-foreground hover:bg-navbar-hover hover:text-navbar-active-foreground"
                      }`}
                    >
                      {Icon && <Icon className="h-4 w-4 shrink-0" />}
                      <span className="truncate">{mod.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Non-OP patient view: grouped modules */
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

// ── Layer 1: FAP Block ───────────────────────────────────
function FapBlock({
  activeFapType,
  setActiveFapType,
  activeFapUnit,
  setActiveFapUnit,
  stationName,
}: {
  activeFapType: FapType
  setActiveFapType: (t: FapType) => void
  activeFapUnit: string
  setActiveFapUnit: (u: string) => void
  stationName: string
}) {
  const [open, setOpen] = useState(false)
  const typeDef = FAP_TYPEN.find(t => t.id === activeFapType) ?? FAP_TYPEN[0]
  const hasUnits = typeDef.units.length > 0
  const isNone = activeFapType === "none"

  return (
    <div className="px-2 pt-2 pb-2 border-b border-navbar-border bg-navbar-hover/10 shrink-0">
      {/* Label */}
      <p className="px-1 pb-1 text-[9px] font-semibold uppercase tracking-wider text-navbar-section">
        Einsatzort
      </p>

      {/* FAP Type selector */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={`flex items-center gap-2 w-full rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors text-left ${
              !isNone
                ? "bg-[#0d9488]/15 text-[#0d9488] hover:bg-[#0d9488]/20 border border-[#0d9488]/30"
                : "bg-transparent text-navbar-section hover:bg-navbar-hover border border-dashed border-navbar-border hover:border-navbar-border"
            }`}
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            {!isNone && <MapPin className="h-3.5 w-3.5 shrink-0" />}
            <span className="flex-1 truncate">{isNone ? stationName : typeDef.label}</span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" className="w-52 p-1">
          <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Einsatzort wählen
          </p>
          {FAP_TYPEN.map(t => (
            <button
              key={t.id}
              role="option"
              aria-selected={activeFapType === t.id}
              onClick={() => { setActiveFapType(t.id); setOpen(false) }}
              className={`flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                activeFapType === t.id
                  ? t.id === "none"
                    ? "bg-muted text-foreground font-medium"
                    : "bg-[#0d9488]/15 text-[#0d9488] font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                activeFapType === t.id
                  ? t.id === "none" ? "bg-muted-foreground" : "bg-[#0d9488]"
                  : "opacity-0"
              }`} />
              {t.id === "none" ? stationName : t.label}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      {/* Unit chip row (only when type has units) */}
      {hasUnits && (
        <div className="flex flex-wrap gap-1 mt-1.5 px-0.5">
          {typeDef.units.map(unit => (
            <button
              key={unit.id}
              onClick={() => setActiveFapUnit(unit.id)}
              className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                activeFapUnit === unit.id
                  ? "bg-[#0d9488] text-white"
                  : "bg-navbar-hover/60 text-navbar-foreground hover:bg-navbar-hover border border-navbar-border/40"
              }`}
            >
              {unit.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── OP-level modules (belong to the OP, not per Eingriff) ──
const MODULES_OP_LEVEL: ModuleItem[] = [
  { id: "op-who-signin",   label: "WHO Sign In",   icon: "clipboard-list", group: "OP-Dokumentation" },
  { id: "op-who-timeout",  label: "WHO Team Timeout", icon: "clipboard-list", group: "OP-Dokumentation" },
  { id: "op-who-signout",  label: "WHO Sign Out",  icon: "clipboard-list", group: "OP-Dokumentation" },
  { id: "op-zeiten",       label: "Zeiten",         icon: "activity",       group: "OP-Dokumentation" },
]

// ── OP-specific Eingriff-level modules ──────────────────
const MODULES_EINGRIFF: ModuleItem[] = [
  { id: "op-basisdaten",   label: "Basisdaten",         icon: "file-text",      group: "eingriff" },
  { id: "op-diagnosen",    label: "Diagnosen/Therapien", icon: "stethoscope",    group: "eingriff" },
  { id: "op-personal",     label: "Personal",            icon: "clipboard-list", group: "eingriff" },
  { id: "op-zk-praeop",    label: "ZK präoperativ",      icon: "clipboard-list", group: "eingriff" },
  { id: "op-zk-postop",    label: "ZK postoperativ",     icon: "clipboard-list", group: "eingriff" },
  { id: "op-pflegedoku",   label: "Pflegedokumentation", icon: "file-text",      group: "eingriff" },
  { id: "op-arztdoku",     label: "Arztdokumentation",   icon: "file-text",      group: "eingriff" },
  { id: "op-material",     label: "Material",            icon: "package-check",  group: "eingriff" },
  { id: "op-leistungen",   label: "Leistungen",          icon: "receipt",        group: "eingriff" },
  { id: "op-medikamente",  label: "Medikamente",         icon: "pill",           group: "eingriff" },
  { id: "op-bericht",      label: "OP-Bericht",          icon: "file-text",      group: "eingriff" },
  { id: "op-dokumente",    label: "Dokumente",           icon: "file-text",      group: "eingriff" },
  { id: "op-anordnungen",  label: "Anordnungen",         icon: "clipboard-list", group: "eingriff" },
  { id: "abrechnung-patient", label: "Abrechnung",       icon: "receipt",        group: "Administration" },
]

// Demo Eingriffe data (matches OpEncounterBlock)
const DEMO_EINGRIFFE = [
  { id: "eingriff-1", label: "Gonarthrose",  opId: "17819847" },
  { id: "eingriff-2", label: "Zehenkorrektur", opId: "17819848" },
]
// ── Layer 4 (OP): Three-level OP Encounter Block ─────────
function OpEncounterBlock({
  activeEingriffIndex,
  setActiveEingriffIndex,
  onNew,
}: {
  activeEingriffIndex: number
  setActiveEingriffIndex: (i: number) => void
  onNew: () => void
}) {
  const [opExpanded, setOpExpanded] = useState(true)
  const safeIndex = Math.min(activeEingriffIndex, DEMO_EINGRIFFE.length - 1)

  return (
    <div className="px-2 pt-1 pb-2">
      <div className="rounded-md bg-navbar-hover/30 border border-navbar-border/40 overflow-hidden">
        {/* Level 1: OP row */}
        <button
          onClick={() => setOpExpanded(v => !v)}
          className="flex items-center gap-1.5 w-full px-2.5 py-1.5 text-left hover:bg-navbar-hover/40 transition-colors"
        >
          <Scissors className="h-3 w-3 shrink-0 text-navbar-foreground" />
          <span className="text-[11px] font-medium text-navbar-active-foreground flex-1 truncate">
            OP vom 26.10.2023
          </span>
          {opExpanded
            ? <ChevronUp className="h-3 w-3 shrink-0 text-navbar-section" />
            : <ChevronDown className="h-3 w-3 shrink-0 text-navbar-section" />
          }
        </button>

        {opExpanded && (
          <>
            {/* Anästhesie metadata (belongs to OP, not Eingriff) */}
            <div className="px-2.5 pb-1.5 border-t border-navbar-border/20">
              <p className="text-[9px] text-navbar-section leading-tight">
                Anästhesie: Nr. 2300131
              </p>
            </div>

            {/* Level 2: Eingriffe */}
            <div className="border-t border-navbar-border/30">
              <p className="px-2.5 pt-1.5 pb-0.5 text-[9px] font-semibold uppercase tracking-wider text-navbar-section">
                Eingriffe
              </p>
              {DEMO_EINGRIFFE.map((eingriff, i) => {
                const isActive = i === safeIndex
                return (
                  <button
                    key={eingriff.id}
                    onClick={() => setActiveEingriffIndex(i)}
                    className={`flex items-start gap-2 w-full px-2.5 py-1.5 text-left transition-colors ${
                      isActive ? "bg-navbar-active/60" : "hover:bg-navbar-hover/60"
                    }`}
                  >
                    <span className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                      isActive ? "bg-[#0d9488]" : "border border-navbar-section"
                    }`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-[11px] truncate ${
                        isActive ? "font-semibold text-navbar-active-foreground" : "text-navbar-foreground"
                      }`}>
                        {eingriff.label}
                      </p>
                      <p className="text-[9px] text-navbar-section truncate">Op-ID: {eingriff.opId}</p>
                    </div>
                  </button>
                )
              })}
              <button
                onClick={onNew}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 text-left text-[11px] text-navbar-section hover:text-navbar-foreground hover:bg-navbar-hover/60 transition-colors border-t border-navbar-border/30"
              >
                <Plus className="h-3 w-3 shrink-0" />
                Eingriff hinzufügen
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function EncounterSelector({
  encounters,
  activeIndex,
  setActiveIndex,
  fapType,
  onNew,
}: {
  encounters: Encounter[]
  activeIndex: number
  setActiveIndex: (i: number) => void
  fapType: FapType
  onNew: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const safeIndex = Math.min(activeIndex, encounters.length - 1)
  const active = encounters[safeIndex]

  const EncIcon = ({ type }: { type: Encounter["iconType"] }) => {
    if (type === "scalpel") return <Scissors className="h-3 w-3 shrink-0" />
    if (type === "phone")   return <Phone className="h-3 w-3 shrink-0" />
    return <BedDouble className="h-3 w-3 shrink-0" />
  }

  const handleSelect = useCallback((i: number) => {
    setActiveIndex(i)
    setExpanded(false)
  }, [setActiveIndex])

  return (
    <div className="px-2 pt-1 pb-2">
      {/* Collapsed row (STATE A) */}
      {!expanded && active && (
        <div className="rounded-md bg-navbar-hover/30 border border-navbar-border/40 overflow-hidden">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5">
            <EncIcon type={active.iconType} />
            <span className="text-[11px] font-medium text-navbar-active-foreground flex-1 truncate">
              {active.label}
            </span>
            <button
              onClick={() => setExpanded(true)}
              className="flex items-center justify-center h-5 w-5 rounded text-navbar-section hover:text-navbar-foreground hover:bg-navbar-hover transition-colors shrink-0"
              aria-label="Alle Ereignisse anzeigen"
              aria-expanded={false}
            >
              <ChevronDown className="h-3 w-3" />
            </button>
            <button
              onClick={onNew}
              className="flex items-center justify-center h-5 w-5 rounded text-navbar-section hover:text-navbar-foreground hover:bg-navbar-hover transition-colors shrink-0"
              aria-label="Neues Ereignis"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          {active.metadata && (
            <div className="px-2.5 pb-1.5 border-t border-navbar-border/20">
              <p className="text-[9px] text-navbar-section leading-tight truncate">
                {active.metadata}{active.metadata2 ? ` · ${active.metadata2}` : ""}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Expanded list (STATE B) */}
      {expanded && (
        <div className="rounded-md bg-navbar-hover/30 border border-navbar-border/40 overflow-hidden">
          {/* Header row */}
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-navbar-border/30">
            <span className="text-[10px] font-semibold text-navbar-section uppercase tracking-wide">
              {sectionLabel(fapType)}
            </span>
            <button
              onClick={() => setExpanded(false)}
              className="flex items-center justify-center h-5 w-5 rounded text-navbar-section hover:text-navbar-foreground hover:bg-navbar-hover transition-colors"
              aria-label="Einklappen"
              aria-expanded={true}
            >
              <ChevronUp className="h-3 w-3" />
            </button>
          </div>
          {/* Encounter rows */}
          {encounters.map((enc, i) => {
            const isActive = i === safeIndex
            return (
              <button
                key={enc.id}
                onClick={() => handleSelect(i)}
                className={`flex items-start gap-2 w-full px-2.5 py-2 text-left transition-colors ${
                  isActive
                    ? "bg-navbar-active/60"
                    : "hover:bg-navbar-hover/60"
                }`}
              >
                <span className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${isActive ? "bg-[#0d9488]" : "border border-navbar-section"}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-[11px] truncate ${isActive ? "font-medium text-navbar-active-foreground" : "text-navbar-foreground"}`}>
                    {enc.labelLong}
                  </p>
                  <p className="text-[9px] text-navbar-section truncate">{enc.metadata}</p>
                </div>
              </button>
            )
          })}
          {/* New encounter button */}
          <button
            onClick={() => { onNew(); setExpanded(false) }}
            className="flex items-center gap-2 w-full px-2.5 py-2 text-left text-[11px] text-navbar-section hover:text-navbar-foreground hover:bg-navbar-hover/60 transition-colors border-t border-navbar-border/30"
          >
            <Plus className="h-3 w-3 shrink-0" />
            {newEncounterLabel(fapType)}
          </button>
        </div>
      )}
    </div>
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
    const rect = e.currentTarget.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const position = e.clientY < midY ? "before" : "after"
    setDropTarget({ index, position })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (dragIndex === null || !dropTarget) { setDragIndex(null); setDropTarget(null); return }
    let toIndex = dropTarget.position === "before" ? dropTarget.index : dropTarget.index + 1
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
          <div className="flex flex-col max-h-36 overflow-y-auto navbar-scroll" onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
            {pinnedPatients.map((pp, index) => {
              const isCurrent = patient?.patientId === pp.patient.patientId
              const isDragging = dragIndex === index
              return (
                <div key={pp.patient.patientId} className="relative">
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

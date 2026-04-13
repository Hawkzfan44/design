"use client"

import { useMemo, useState, useRef, useEffect, useCallback } from "react"
import { useShell } from "@/lib/shell-context"
import { FAP_TYPEN } from "@/lib/shell-context"
import type { FapType } from "@/lib/shell-context"
import { ARBEITSLISTEN_MODULE } from "@/lib/types"
import type { PatientContext, PinnedPatient } from "@/lib/types"
import {
  PanelLeftClose, PanelLeftOpen,
  BedDouble, PackageCheck, Receipt, ClipboardList,
  Pill, Activity, Stethoscope, FileText,
  ChevronLeft, ChevronRight, Search, ChevronsUpDown,
  ListTodo, UserRound, Pin, X, GripVertical,
  Scissors, Plus, ChevronDown, ChevronUp,
  Building2,
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

// ── Arbeitsbereich taxonomy ──────────────────────────────
// Three top-level types shown in step 1
const AB_TYPEN = [
  { id: "op",          label: "OP" },
  { id: "ambulanz",    label: "Ambulanz" },
  { id: "funktionsstellen", label: "Funktionsstellen" },
] as const

type AbTypId = typeof AB_TYPEN[number]["id"]

// Sub-selections per type (step 2)
const AB_SUBS: Record<AbTypId, { id: string; label: string }[]> = {
  op: [
    { id: "holding",          label: "Holding" },
    { id: "kopf-op",          label: "Kopf-OP" },
    { id: "extremitaeten-op", label: "Extremitäten-OP" },
    { id: "wirbelsaeule",     label: "Wirbelsäulen-OP" },
    { id: "becken-bein",      label: "Becken-Bein-Einheit" },
    { id: "aufwachraum",      label: "Aufwachraum" },
  ],
  ambulanz: [
    { id: "chirurgisch",  label: "Chirurgische Amb." },
    { id: "orthopaedie",  label: "Orthopädische Amb." },
    { id: "medizinisch",  label: "Medizinische Amb." },
    { id: "kardiologie",  label: "Kardiologische Amb." },
  ],
  funktionsstellen: [
    { id: "radiologie",       label: "Radiologie" },
    { id: "endoskopie",       label: "Endoskopie" },
    { id: "labor",            label: "Labor" },
    { id: "herzkatheterlabor",label: "Herzkatheterlabor" },
  ],
}

// Derive FapType from AbTypId for module/list switching
function abTypToFapType(abTyp: AbTypId | null, subId: string): FapType {
  if (abTyp === "op")        return "op"
  if (abTyp === "ambulanz")  return "ambulanz"
  if (abTyp === "funktionsstellen" && subId === "endoskopie") return "endoskopie"
  if (abTyp === "funktionsstellen") return "mrt"
  return "none"
}

// ── Module definitions ───────────────────────────────────
interface ModuleItem { id: string; label: string; icon: string; group: string }

const MODULES_NO_FAP: ModuleItem[] = [
  { id: "verordnungen",    label: "Verordnungen",  icon: "pill",        group: "Fallübersicht" },
  { id: "kurve",           label: "Kurve",          icon: "activity",    group: "Fallübersicht" },
  { id: "diagnosen",       label: "Diagnosen",      icon: "stethoscope", group: "Fallübersicht" },
  { id: "dokumentation",   label: "Dokumentation",  icon: "file-text",   group: "Fallübersicht" },
  { id: "abrechnung-patient", label: "Abrechnung",  icon: "receipt",     group: "Administration" },
]

const MODULES_OP_LEVEL: ModuleItem[] = [
  { id: "op-who-signin",  label: "WHO Sign In",     icon: "clipboard-list", group: "OP-Dokumentation" },
  { id: "op-who-timeout", label: "WHO Team Timeout", icon: "clipboard-list", group: "OP-Dokumentation" },
  { id: "op-who-signout", label: "WHO Sign Out",     icon: "clipboard-list", group: "OP-Dokumentation" },
  { id: "op-zeiten",      label: "Zeiten",           icon: "activity",       group: "OP-Dokumentation" },
]

const MODULES_EINGRIFF: ModuleItem[] = [
  { id: "op-basisdaten",      label: "Basisdaten",          icon: "file-text",      group: "Eingriff" },
  { id: "op-diagnosen",       label: "Diagnosen/Therapien",  icon: "stethoscope",    group: "Eingriff" },
  { id: "op-personal",        label: "Personal",             icon: "clipboard-list", group: "Eingriff" },
  { id: "op-zk-praeop",       label: "ZK präoperativ",       icon: "clipboard-list", group: "Eingriff" },
  { id: "op-zk-postop",       label: "ZK postoperativ",      icon: "clipboard-list", group: "Eingriff" },
  { id: "op-pflegedoku",      label: "Pflegedokumentation",  icon: "file-text",      group: "Eingriff" },
  { id: "op-arztdoku",        label: "Arztdokumentation",    icon: "file-text",      group: "Eingriff" },
  { id: "op-material",        label: "Material",             icon: "package-check",  group: "Eingriff" },
  { id: "op-leistungen",      label: "Leistungen",           icon: "receipt",        group: "Eingriff" },
  { id: "op-medikamente",     label: "Medikamente",          icon: "pill",           group: "Eingriff" },
  { id: "op-bericht",         label: "OP-Bericht",           icon: "file-text",      group: "Eingriff" },
  { id: "op-dokumente",       label: "Dokumente",            icon: "file-text",      group: "Eingriff" },
  { id: "op-anordnungen",     label: "Anordnungen",          icon: "clipboard-list", group: "Eingriff" },
  { id: "abrechnung-patient", label: "Abrechnung",           icon: "receipt",        group: "Administration" },
]

const MODULES_AMBULANZ: ModuleItem[] = [
  { id: "verordnungen",  label: "Verordnungen",  icon: "pill",        group: "Fallübersicht" },
  { id: "diagnosen",     label: "Diagnosen",     icon: "stethoscope", group: "Fallübersicht" },
  { id: "dokumentation", label: "Dokumentation", icon: "file-text",   group: "Fallübersicht" },
  { id: "befunde",       label: "Befunde",        icon: "activity",    group: "Fallübersicht" },
  { id: "abrechnung-patient", label: "Abrechnung", icon: "receipt",   group: "Administration" },
]

// Demo Eingriffe data for OP encounter block
const DEMO_EINGRIFFE = [
  { id: "eingriff-1", label: "Gonarthrose",    opId: "17819847" },
  { id: "eingriff-2", label: "Zehenkorrektur", opId: "17819848" },
]

function getPatientModulesForAbTyp(abTyp: AbTypId | null): ModuleItem[] {
  if (abTyp === "op")       return []  // handled separately as two-section
  if (abTyp === "ambulanz") return MODULES_AMBULANZ
  return MODULES_NO_FAP
}

// ── Arbeitslisten per Arbeitsbereich ─────────────────────
const LISTEN_OP_DEFS = [
  { id: "op-liste",    label: "OP-Liste",    icon: "bed-double" },
  { id: "aufgaben-op", label: "Aufgaben",    icon: "clipboard-list" },
  { id: "checklisten", label: "Checklisten", icon: "package-check" },
  { id: "saalbelegung",label: "Saalbelegung",icon: "activity" },
]
const LISTEN_AMBULANZ_DEFS = [
  { id: "terminliste",       label: "Terminliste", icon: "clipboard-list" },
  { id: "warteliste",        label: "Warteliste",  icon: "bed-double" },
  { id: "aufgaben-ambulanz", label: "Aufgaben",    icon: "clipboard-list" },
]
const LISTEN_FUNK_DEFS = [
  { id: "untersuchungsliste", label: "Untersuchungsliste", icon: "bed-double" },
  { id: "aufgaben-funk",      label: "Aufgaben",           icon: "clipboard-list" },
]

function getListenForAbTyp(abTyp: AbTypId | null): typeof ARBEITSLISTEN_MODULE {
  if (abTyp === "op")              return LISTEN_OP_DEFS
  if (abTyp === "ambulanz")        return LISTEN_AMBULANZ_DEFS
  if (abTyp === "funktionsstellen") return LISTEN_FUNK_DEFS
  return ARBEITSLISTEN_MODULE
}

// ── Helpers ──────────────────────────────────────────────
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
    activeEncounterIndex, setActiveEncounterIndex,
  } = useShell()

  const { toast } = useToast()

  // Arbeitsbereich state — local, not in shell context
  // abTyp: which top-level type is active (null = none)
  // abSub: which sub-item is active
  const [abTyp, setAbTyp] = useState<AbTypId | null>(null)
  const [abSub, setAbSub] = useState<string>("")
  // Inline selection panel: "type" | "sub" | null
  const [abSelectStep, setAbSelectStep] = useState<"type" | "sub" | null>(null)

  // Keep FAP context in sync when Arbeitsbereich changes
  useEffect(() => {
    const fapType = abTypToFapType(abTyp, abSub)
    setActiveFapType(fapType)
    setActiveEncounterIndex(0)
  }, [abTyp, abSub, setActiveFapType, setActiveEncounterIndex])

  const hasAb = abTyp !== null
  const abLabel = useMemo(() => {
    if (!abTyp) return ""
    const sub = AB_SUBS[abTyp].find(s => s.id === abSub)
    return sub ? sub.label : (AB_TYPEN.find(t => t.id === abTyp)?.label ?? "")
  }, [abTyp, abSub])

  // Dynamic lists/modules based on Arbeitsbereich
  const listenModules = useMemo(() => getListenForAbTyp(abTyp), [abTyp])
  const patientModules = useMemo(() => getPatientModulesForAbTyp(abTyp), [abTyp])

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

  // When an Arbeitsbereich sub is selected, close the panel
  const selectSub = (typId: AbTypId, subId: string) => {
    setAbTyp(typId)
    setAbSub(subId)
    setAbSelectStep(null)
  }

  const resetAb = () => {
    setAbTyp(null)
    setAbSub("")
    setAbSelectStep(null)
  }

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={`
          hidden md:flex flex-col h-full bg-navbar border-r border-navbar-border
          transition-[width] duration-200 ease-in-out shrink-0
          ${collapsed ? "w-16" : "w-60"}
        `}
      >
        {/* ── Header: Logo + Collapse ──────────────────── */}
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

        {/* ── Arbeitsbereich chip / selector ───────────── */}
        {!collapsed && (
          <div className="px-2 pt-2 pb-2 border-b border-navbar-border shrink-0">
            {abSelectStep === null ? (
              // Default: chip or "+ Arbeitsbereich" link
              hasAb ? (
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center gap-1.5 flex-1 min-w-0 rounded-md bg-[#0d9488]/15 border border-[#0d9488]/30 px-2 py-1 text-xs font-medium text-[#0d9488]">
                    <Building2 className="h-3 w-3 shrink-0" />
                    <span className="truncate">{abLabel}</span>
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={resetAb}
                        className="flex h-6 w-6 items-center justify-center rounded text-navbar-section hover:text-navbar-active-foreground hover:bg-navbar-hover transition-colors shrink-0"
                        aria-label="Arbeitsbereich zurücksetzen"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Zurücksetzen</TooltipContent>
                  </Tooltip>
                </div>
              ) : (
                <button
                  onClick={() => setAbSelectStep("type")}
                  className="flex items-center gap-1 text-[11px] text-navbar-section hover:text-navbar-active-foreground transition-colors px-1 py-0.5"
                >
                  <Plus className="h-3 w-3" />
                  Arbeitsbereich
                </button>
              )
            ) : abSelectStep === "type" ? (
              // Step 1: choose type
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between mb-1 px-1">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-navbar-section">Arbeitsbereich wählen</span>
                  <button onClick={() => setAbSelectStep(null)} className="text-navbar-section hover:text-navbar-active-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                {AB_TYPEN.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setAbSelectStep("sub")}
                    onMouseDown={() => setAbTyp(t.id)}
                    className="flex items-center gap-2 w-full rounded-md px-2.5 py-2 text-sm text-left text-navbar-foreground hover:bg-navbar-hover hover:text-navbar-active-foreground transition-colors"
                  >
                    {t.label}
                    <ChevronRight className="h-3.5 w-3.5 ml-auto shrink-0 text-navbar-section" />
                  </button>
                ))}
              </div>
            ) : (
              // Step 2: choose sub
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1 mb-1 px-1">
                  <button
                    onClick={() => setAbSelectStep("type")}
                    className="text-navbar-section hover:text-navbar-active-foreground"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-navbar-section flex-1">
                    {AB_TYPEN.find(t => t.id === abTyp)?.label}
                  </span>
                  <button onClick={() => setAbSelectStep(null)} className="text-navbar-section hover:text-navbar-active-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                {abTyp && AB_SUBS[abTyp].map(s => (
                  <button
                    key={s.id}
                    onClick={() => selectSub(abTyp, s.id)}
                    className="flex items-center w-full rounded-md px-2.5 py-1.5 text-sm text-left text-navbar-foreground hover:bg-navbar-hover hover:text-navbar-active-foreground transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Collapsed: Arbeitsbereich icon */}
        {collapsed && (
          <div className="flex flex-col items-center py-2 border-b border-navbar-border shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => { /* expand to interact */ }}
                  className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                    hasAb ? "text-[#0d9488] bg-[#0d9488]/15" : "text-navbar-section hover:bg-navbar-hover"
                  }`}
                  aria-label="Arbeitsbereich"
                >
                  <Building2 className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {hasAb ? abLabel : "Arbeitsbereich wählen"}
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* ── View Mode Toggle ─────────────────────────── */}
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

        {/* ── Patient Block ────────────────────────────── */}
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

        {/* ── Module Navigation ────────────────────────── */}
        <nav className="flex-1 overflow-y-auto navbar-scroll px-2 pt-2 pb-3">
          {viewMode === "listen" ? (
            <ModuleList
              modules={listenModules}
              activeModule={activeModule}
              setActiveModule={setActiveModule}
              collapsed={collapsed}
            />
          ) : abTyp === "op" ? (
            <OpPatientNav
              activeModule={activeModule}
              setActiveModule={setActiveModule}
              activeEncounterIndex={activeEncounterIndex}
              collapsed={collapsed}
            />
          ) : (
            <GroupedModuleList
              groups={groupedPatientModules}
              activeModule={activeModule}
              setActiveModule={setActiveModule}
              collapsed={collapsed}
            />
          )}
        </nav>

        {/* ── Pinned Patients (bottom) ─────────────────── */}
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

// ── Shared module button renderer ────────────────────────
function ModuleButton({
  mod,
  active,
  collapsed,
  onClick,
}: {
  mod: { id: string; label: string; icon: string }
  active: boolean
  collapsed: boolean
  onClick: () => void
}) {
  const Icon = ICONS[mod.icon]
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
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
    )
  }
  return (
    <button
      onClick={onClick}
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
}

function ModuleList({
  modules,
  activeModule,
  setActiveModule,
  collapsed,
}: {
  modules: { id: string; label: string; icon: string }[]
  activeModule: string
  setActiveModule: (id: string) => void
  collapsed: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {modules.map(mod => (
        <ModuleButton
          key={mod.id}
          mod={mod}
          active={activeModule === mod.id}
          collapsed={collapsed}
          onClick={() => setActiveModule(mod.id)}
        />
      ))}
    </div>
  )
}

function GroupedModuleList({
  groups,
  activeModule,
  setActiveModule,
  collapsed,
}: {
  groups: { label: string; modules: ModuleItem[] }[]
  activeModule: string
  setActiveModule: (id: string) => void
  collapsed: boolean
}) {
  return (
    <div className="flex flex-col gap-3">
      {groups.map(group => (
        <div key={group.label}>
          {!collapsed && group.label && (
            <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-navbar-section">
              {group.label}
            </p>
          )}
          {collapsed && group.label && (
            <div className="mx-auto mb-1 h-px w-6 bg-navbar-border" />
          )}
          <ModuleList
            modules={group.modules}
            activeModule={activeModule}
            setActiveModule={setActiveModule}
            collapsed={collapsed}
          />
        </div>
      ))}
    </div>
  )
}

function OpPatientNav({
  activeModule,
  setActiveModule,
  activeEncounterIndex,
  collapsed,
}: {
  activeModule: string
  setActiveModule: (id: string) => void
  activeEncounterIndex: number
  collapsed: boolean
}) {
  const eingriff = DEMO_EINGRIFFE[Math.min(activeEncounterIndex, DEMO_EINGRIFFE.length - 1)]
  return (
    <div className="flex flex-col gap-3">
      {!collapsed && (
        <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-navbar-section">
          OP-Dokumentation
        </p>
      )}
      <ModuleList
        modules={MODULES_OP_LEVEL}
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        collapsed={collapsed}
      />
      {!collapsed && eingriff && (
        <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#0d9488]/80">
          {`Eingriff: ${eingriff.label}`}
        </p>
      )}
      {collapsed && <div className="mx-auto mb-1 h-px w-6 bg-navbar-border" />}
      <ModuleList
        modules={MODULES_EINGRIFF}
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        collapsed={collapsed}
      />
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
  const dragIndex = useRef<number | null>(null)

  if (pinnedPatients.length === 0) return null

  const handleDrop = (toIndex: number) => {
    if (dragIndex.current === null || dragIndex.current === toIndex) return
    reorderPinnedPatients(dragIndex.current, toIndex)
    dragIndex.current = null
  }

  return (
    <div className="border-t border-navbar-border shrink-0">
      {!collapsed && (
        <div className="px-3 pt-1.5 pb-0.5">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-navbar-section">
            Angepinnt
          </p>
        </div>
      )}
      <div className="flex flex-col max-h-36 overflow-y-auto navbar-scroll" onDragOver={e => e.preventDefault()} onDrop={() => {}}>
        {pinnedPatients.map((pp, i) => {
          const isActive = patient?.patientId === pp.patient.patientId
          return collapsed ? (
            <Tooltip key={pp.patient.patientId}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => openPinnedPatient(pp.patient.patientId)}
                  className={`flex h-8 w-full items-center justify-center rounded-md mx-auto transition-colors ${
                    isActive ? "text-mh-blau" : "text-navbar-section hover:text-navbar-active-foreground hover:bg-navbar-hover"
                  }`}
                >
                  <UserRound className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{pp.patient.name}</TooltipContent>
            </Tooltip>
          ) : (
            <div
              key={pp.patient.patientId}
              draggable
              onDragStart={() => { dragIndex.current = i }}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(i)}
              className={`flex items-center gap-1.5 px-2 py-1 mx-1 rounded-md cursor-pointer group transition-colors ${
                isActive ? "bg-navbar-active text-navbar-active-foreground" : "hover:bg-navbar-hover"
              }`}
              onClick={() => openPinnedPatient(pp.patient.patientId)}
            >
              <GripVertical className="h-3 w-3 text-navbar-section opacity-0 group-hover:opacity-100 shrink-0 cursor-grab" />
              <UserRound className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-navbar-active-foreground" : "text-navbar-section"}`} />
              <span className={`flex-1 text-[11px] truncate ${isActive ? "font-medium text-navbar-active-foreground" : "text-navbar-foreground"}`}>
                {pp.patient.name}
              </span>
              <button
                onClick={e => { e.stopPropagation(); unpinPatient(pp.patient.patientId) }}
                className="opacity-0 group-hover:opacity-100 flex h-4 w-4 items-center justify-center rounded text-navbar-section hover:text-navbar-active-foreground transition-colors shrink-0"
                aria-label="Unpin"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

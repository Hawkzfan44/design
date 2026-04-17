"use client"

import { useMemo, useState, useRef, useCallback, useEffect } from "react"
import { useShell } from "@/lib/shell-context"
import { ARBEITSBEREICH_TYPEN } from "@/lib/shell-context"
import type { ArbeitskontextTyp } from "@/lib/shell-context"
import { ARBEITSLISTEN_MODULE } from "@/lib/types"
import type { PatientContext, PinnedPatient, Fall } from "@/lib/types"
import {
  PanelLeftClose, PanelLeftOpen,
  BedDouble, PackageCheck, Receipt, ClipboardList,
  Pill, Activity, Stethoscope, FileText,
  ChevronLeft, ChevronRight, Search, ChevronsUpDown,
  ListTodo, ListChecks, UserRound, Pin, X, GripVertical,
  Building2, Menu,
} from "lucide-react"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import {
  Sheet, SheetContent,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

// ── Icon resolver ─────────────────────────────────────────
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "bed-double":     BedDouble,
  "package-check":  PackageCheck,
  "receipt":        Receipt,
  "clipboard-list": ClipboardList,
  "pill":           Pill,
  "activity":       Activity,
  "stethoscope":    Stethoscope,
  "file-text":      FileText,
}

// ── Arbeitsbereich taxonomy ───────────────────────────────
const AB_TYPEN = [
  { id: "op",              label: "OP" },
  { id: "ambulanz",        label: "Ambulanz" },
  { id: "funktionsstellen",label: "Funktionsstellen" },
] as const

type AbTypId = typeof AB_TYPEN[number]["id"]

const AB_SUBS: Record<AbTypId, { id: string; label: string }[]> = {
  op: [
    { id: "kopf-op",          label: "Kopf-OP" },
    { id: "extremitaeten-op", label: "Extremitäten-OP" },
    { id: "wirbelsaeule",     label: "Wirbelsäulen-OP" },
    { id: "becken-bein",      label: "Becken-Bein-Einheit" },
  ],
  ambulanz: [
    { id: "chirurgisch",  label: "Chirurgische Amb." },
    { id: "orthopaedie",  label: "Orthopädische Amb." },
    { id: "medizinisch",  label: "Medizinische Amb." },
    { id: "kardiologie",  label: "Kardiologische Amb." },
  ],
  funktionsstellen: [
    { id: "radiologie",        label: "Radiologie" },
    { id: "endoskopie",        label: "Endoskopie" },
    { id: "labor",             label: "Labor" },
    { id: "herzkatheterlabor", label: "Herzkatheterlabor" },
  ],
}

function abTypToArbeitskontextTyp(abTyp: AbTypId | null, subId: string): ArbeitskontextTyp {
  if (abTyp === "op")               return "op"
  if (abTyp === "ambulanz")         return "ambulanz"
  if (abTyp === "funktionsstellen") return "funk"
  return "none"
}

// ── Module definitions ────────────────────────────────────
interface ModuleItem { id: string; label: string; icon: string; group: string }

const MODULES_NO_FAP: ModuleItem[] = [
  { id: "kurve",              label: "Kurve",         icon: "activity",    group: "Patient" },
  { id: "diagnosen",          label: "Diagnosen",     icon: "stethoscope", group: "Patient" },
  { id: "verordnungen",       label: "Verordnungen",  icon: "pill",        group: "Patient" },
  { id: "dokumentation",      label: "Dokumentation", icon: "file-text",   group: "Patient" },
]

const MODULES_OP_LEVEL: ModuleItem[] = [
  { id: "op-who-signin",  label: "WHO Sign In",     icon: "clipboard-list", group: "OP" },
  { id: "op-who-timeout", label: "WHO Timeout",     icon: "clipboard-list", group: "OP" },
  { id: "op-who-signout", label: "WHO Sign Out",    icon: "clipboard-list", group: "OP" },
]

const MODULES_EINGRIFF: ModuleItem[] = [
  { id: "op-basisdaten",  label: "Basisdaten",      icon: "file-text",      group: "Eingriff" },
  { id: "op-diagnosen",   label: "Diagnosen",       icon: "stethoscope",    group: "Eingriff" },
  { id: "op-personal",    label: "Personal",        icon: "clipboard-list", group: "Eingriff" },
  { id: "op-pflegedoku",  label: "Pflege",          icon: "file-text",      group: "Eingriff" },
  { id: "op-arztdoku",    label: "Arztdoku",        icon: "file-text",      group: "Eingriff" },
  { id: "op-material",    label: "Material",        icon: "package-check",  group: "Eingriff" },
  { id: "op-bericht",     label: "OP-Bericht",      icon: "file-text",      group: "Eingriff" },
]

const MODULES_AMBULANZ: ModuleItem[] = [
  { id: "diagnosen",      label: "Diagnosen",       icon: "stethoscope", group: "Patient" },
  { id: "verordnungen",   label: "Verordnungen",    icon: "pill",        group: "Patient" },
  { id: "dokumentation",  label: "Dokumentation",   icon: "file-text",   group: "Patient" },
  { id: "befunde",        label: "Befunde",         icon: "activity",    group: "Patient" },
]

const DEMO_EINGRIFFE = [
  { id: "eingriff-1", label: "Gonarthrose",    opId: "17819847" },
  { id: "eingriff-2", label: "Zehenkorrektur", opId: "17819848" },
]

function getPatientModulesForAbTyp(abTyp: AbTypId | null): ModuleItem[] {
  if (abTyp === "op")       return []
  if (abTyp === "ambulanz") return MODULES_AMBULANZ
  return MODULES_NO_FAP
}

const LISTEN_OP_DEFS = [
  { id: "op-liste",     label: "OP-Liste",    icon: "bed-double" },
  { id: "saalbelegung", label: "Saalbelegung", icon: "activity" },
  { id: "aufgaben-op",  label: "Aufgaben",    icon: "clipboard-list" },
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
  if (abTyp === "op")               return LISTEN_OP_DEFS
  if (abTyp === "ambulanz")         return LISTEN_AMBULANZ_DEFS
  if (abTyp === "funktionsstellen") return LISTEN_FUNK_DEFS
  return ARBEITSLISTEN_MODULE
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
}

// ── Shared state hook — drives both desktop + mobile ─────
function useNavState() {
  const shell = useShell()
  const { toast } = useToast()

  const [abTyp, setAbTyp]   = useState<AbTypId | null>(null)
  const [abSub, setAbSub]   = useState<string>("")
  const [abSelectStep, setAbSelectStep] = useState<"type" | "sub" | null>(null)

  useEffect(() => {
    shell.setArbeitskontextTyp(abTypToArbeitskontextTyp(abTyp, abSub))
    shell.setArbeitskontextEinheit(abSub)
    shell.setActiveEncounterIndex(0)
  }, [abTyp, abSub])

  const hasAb = abTyp !== null
  const abLabel = useMemo(() => {
    if (!abTyp) return ""
    const sub = AB_SUBS[abTyp].find(s => s.id === abSub)
    return sub ? sub.label : (AB_TYPEN.find(t => t.id === abTyp)?.label ?? "")
  }, [abTyp, abSub])

  const listenModules  = useMemo(() => getListenForAbTyp(abTyp), [abTyp])
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

  const selectSub = (typId: AbTypId, subId: string) => {
    setAbTyp(typId); setAbSub(subId); setAbSelectStep(null)
  }
  const resetAb = () => {
    setAbTyp(null); setAbSub(""); setAbSelectStep(null)
  }

  return {
    ...shell,
    abTyp, setAbTyp, abSub, abSelectStep, setAbSelectStep,
    hasAb, abLabel,
    listenModules, groupedPatientModules,
    selectSub, resetAb,
  }
}

// ─────────────────────────────────────────────────────────
// NavContent — shared between desktop sidebar + mobile sheet
// ─────────────────────────────────────────────────────────
interface NavContentProps {
  collapsed: boolean
  onClose?: () => void // only used in mobile sheet
  state: ReturnType<typeof useNavState>
}

function NavContent({ collapsed, onClose, state }: NavContentProps) {
  const {
    viewMode, setViewMode,
    activeModule, setActiveModule,
    patient, navigatePatient, patientIndex,
    stationPatients,
    setPatientFall,
    setPatientSearchOpen,
    pinnedPatients, pinPatient, unpinPatient, openPinnedPatient, isPatientPinned, reorderPinnedPatients,
    activeEncounterIndex,
    abTyp, setAbTyp, abSub, abSelectStep, setAbSelectStep,
    hasAb, abLabel,
    listenModules, groupedPatientModules,
    selectSub, resetAb,
  } = state

  const handleModule = (id: string) => {
    setActiveModule(id)
    onClose?.()
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Arbeitsbereich chip / selector ─────────────── */}
      {!collapsed && (
        <div className="px-2 pt-2 pb-2 border-b border-navbar-border shrink-0">
          {abSelectStep === null ? (
            hasAb ? (
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1.5 flex-1 min-w-0 rounded-md bg-[#0d9488]/15 border border-[#0d9488]/30 px-2 py-1 text-xs font-medium text-[#0d9488]">
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">{abLabel}</span>
                </span>
                <button
                  onClick={resetAb}
                  className="flex h-6 w-6 items-center justify-center rounded text-navbar-section hover:text-navbar-active-foreground hover:bg-navbar-hover transition-colors shrink-0"
                  aria-label="Arbeitsbereich zurücksetzen"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-1">
                <span className="text-[11px] text-navbar-section flex-1 truncate">
                  Station · 3A <span className="opacity-60">(Standard)</span>
                </span>
                <button
                  onClick={() => setAbSelectStep("type")}
                  className="text-[10px] text-navbar-section hover:text-navbar-active-foreground transition-colors shrink-0 underline underline-offset-2"
                >
                  Wechseln
                </button>
              </div>
            )
          ) : abSelectStep === "type" ? (
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
                  onClick={() => { setAbTyp(t.id as AbTypId); setAbSelectStep("sub") }}
                  className="flex items-center gap-2 w-full rounded-md px-2.5 py-2 text-sm text-left text-navbar-foreground hover:bg-navbar-hover hover:text-navbar-active-foreground transition-colors"
                >
                  {t.label}
                  <ChevronRight className="h-3.5 w-3.5 ml-auto shrink-0 text-navbar-section" />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1 mb-1 px-1">
                <button onClick={() => setAbSelectStep("type")} className="text-navbar-section hover:text-navbar-active-foreground">
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

      {/* Collapsed: Arbeitsbereich Popover slot */}
      {collapsed && (
        <div className="flex flex-col items-center py-2 border-b border-navbar-border shrink-0">
          <AbPopover
            abTyp={abTyp}
            abSub={abSub}
            abLabel={abLabel}
            hasAb={hasAb}
            onSelect={selectSub}
            onReset={resetAb}
          />
        </div>
      )}

      {/* ── View Mode Toggle ─��────────────────────────── */}
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
                  <BedDouble className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Patientensicht</TooltipContent>
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
              <BedDouble className="h-3.5 w-3.5" />
              Patient
            </button>
          </div>
        )}
      </div>

      {/* ── Patient Block (expanded) ──────────────────── */}
      {viewMode === "patient" && patient && !collapsed && (
        <div className="px-2 pt-2 pb-0 shrink-0 border-b border-navbar-border">
          <div className="rounded-lg bg-navbar-hover/30 px-2 py-1.5 mb-2">
            {/* Row 1: prev | name | next | pin */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => navigatePatient("prev")}
                disabled={stationPatients.length <= 1}
                className="flex h-6 w-6 items-center justify-center rounded text-navbar-foreground hover:bg-navbar-hover disabled:opacity-30 transition-colors shrink-0"
                aria-label="Vorheriger Patient"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => { setPatientSearchOpen(true); onClose?.() }}
                className="flex items-center min-w-0 flex-1 text-left px-0.5"
              >
                <span className="text-[13px] font-semibold text-navbar-active-foreground truncate" title={patient.name}>
                  {patient.name}
                </span>
              </button>
              <button
                onClick={() => navigatePatient("next")}
                disabled={stationPatients.length <= 1}
                className="flex h-6 w-6 items-center justify-center rounded text-navbar-foreground hover:bg-navbar-hover disabled:opacity-30 transition-colors shrink-0"
                aria-label="Naechster Patient"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      if (isPatientPinned(patient.patientId)) unpinPatient(patient.patientId)
                      else pinPatient(patient)
                    }}
                    className={`flex h-5 w-5 items-center justify-center rounded shrink-0 transition-colors ${
                      isPatientPinned(patient.patientId) ? "text-mh-blau" : "text-navbar-section hover:text-navbar-active-foreground"
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
            {/* Row 2: station + index */}
            <div className="px-6">
              <span className="text-[10px] text-navbar-section">
                St. {patient.station} &nbsp;·&nbsp; {patientIndex + 1} / {stationPatients.length}
              </span>
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
                  <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Fälle von {patient.name}</p>
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

      {/* Collapsed: Patient Popover slot */}
      {viewMode === "patient" && patient && collapsed && (
        <div className="flex flex-col items-center py-1 px-1 border-b border-navbar-border shrink-0">
          <PatientPopover
            patient={patient}
            patientIndex={patientIndex}
            stationPatients={stationPatients}
            isPatientPinned={isPatientPinned}
            pinPatient={pinPatient}
            unpinPatient={unpinPatient}
            navigatePatient={navigatePatient}
            setPatientSearchOpen={setPatientSearchOpen}
            setPatientFall={setPatientFall}
          />
        </div>
      )}

      {/* ── Module Navigation ──────────────────────────── */}
      <nav className="flex-1 overflow-y-auto navbar-scroll px-2 pt-2 pb-3">
        {viewMode === "listen" ? (
          <>
            <UeberblickEntry abTyp={abTyp} activeModule={activeModule} collapsed={collapsed} onModuleClick={handleModule} />
            <ModuleList
              modules={listenModules}
              activeModule={activeModule}
              collapsed={collapsed}
              onModuleClick={handleModule}
            />
          </>
        ) : abTyp === "op" ? (
          <OpPatientNav
            activeModule={activeModule}
            activeEncounterIndex={activeEncounterIndex}
            collapsed={collapsed}
            onModuleClick={handleModule}
          />
        ) : (
          <GroupedModuleList
            groups={groupedPatientModules}
            activeModule={activeModule}
            collapsed={collapsed}
            onModuleClick={handleModule}
          />
        )}
      </nav>

      {/* ── Pinned Patients (bottom) ──────────────────── */}
      <PinnedPatientsSection
        pinnedPatients={pinnedPatients}
        patient={patient}
        collapsed={collapsed}
        openPinnedPatient={(id) => { openPinnedPatient(id); onClose?.() }}
        unpinPatient={unpinPatient}
        reorderPinnedPatients={reorderPinnedPatients}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Desktop sidebar
// ─────────────────────────────────────────────────────────
export function SidebarNav() {
  const state = useNavState()
  const { collapsed, toggleCollapsed } = state

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={`
          hidden md:flex flex-col h-full bg-navbar border-r border-navbar-border
          transition-[width] duration-200 ease-in-out shrink-0
          ${collapsed ? "w-16" : "w-60"}
        `}
      >
        {/* Header: Logo + Collapse */}
        <div className="flex items-center h-12 px-3 gap-2 border-b border-navbar-border shrink-0">
          {!collapsed && (
            <span className="text-sm font-bold text-navbar-active-foreground tracking-tight select-none">
              Web M-KIS
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

        <NavContent collapsed={collapsed} state={state} />
      </aside>
    </TooltipProvider>
  )
}

// ─────────────────────────────────────────────────────────
// Mobile burger button + Sheet (same NavContent, expanded)
// ─────────────────────────────────────────────────────────
export function MobileNav() {
  const [open, setOpen] = useState(false)
  const state = useNavState()

  return (
    <TooltipProvider delayDuration={200}>
      {/* Burger button shown in topbar on mobile */}
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-md text-topbar-foreground hover:bg-secondary transition-colors"
        aria-label="Navigation öffnen"
      >
        <Menu className="h-5 w-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-72 p-0 bg-navbar border-navbar-border flex flex-col gap-0"
        >
          {/* Sheet header */}
          <div className="flex items-center h-12 px-3 border-b border-navbar-border shrink-0">
            <span className="text-sm font-bold text-navbar-active-foreground tracking-tight select-none">
              Web M-KIS
            </span>
          </div>

          {/* Same nav content, always expanded */}
          <NavContent collapsed={false} onClose={() => setOpen(false)} state={state} />
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  )
}

// ─────────────────────────────────────────────────────────
// AbPopover — Arbeitsbereich selector (collapsed sidebar)
// Tooltip and Popover use separate trigger elements to avoid nesting conflict
// ─────────────────────────────────────────────────────────
function AbPopover({
  abTyp, abSub, abLabel, hasAb, onSelect, onReset,
}: {
  abTyp: AbTypId | null
  abSub: string
  abLabel: string
  hasAb: boolean
  onSelect: (typId: AbTypId, subId: string) => void
  onReset: () => void
}) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"type" | "sub">("type")
  const [pendingTyp, setPendingTyp] = useState<AbTypId | null>(abTyp)

  const handleOpenChange = (v: boolean) => {
    setOpen(v)
    if (v) { setStep("type"); setPendingTyp(abTyp) }
  }

  const btnClass = `flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
    hasAb
      ? "text-[#0d9488] bg-[#0d9488]/15 hover:bg-[#0d9488]/25"
      : "text-navbar-section hover:bg-navbar-hover hover:text-navbar-foreground"
  }`

  return (
    <Tooltip disableHoverableContent={open}>
      <TooltipTrigger asChild>
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <button className={btnClass} aria-label="Einsatzort">
              <Building2 className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="right" align="start" className="w-52 p-1.5" onOpenAutoFocus={e => e.preventDefault()}>
            {step === "type" ? (
              <>
                <div className="flex items-center justify-between px-1 pb-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Einsatzort</p>
                  {hasAb && (
                    <button
                      onClick={() => { onReset(); setOpen(false) }}
                      className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Zurücksetzen
                    </button>
                  )}
                </div>
                {AB_TYPEN.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setPendingTyp(t.id); setStep("sub") }}
                    className={`flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                      abTyp === t.id
                        ? "bg-[#0d9488]/10 text-[#0d9488] font-medium"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {t.label}
                    <ChevronRight className="h-3.5 w-3.5 ml-auto shrink-0 opacity-40" />
                  </button>
                ))}
              </>
            ) : (
              <>
                <div className="flex items-center gap-1 px-1 pb-1.5">
                  <button onClick={() => setStep("type")} className="text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex-1">
                    {AB_TYPEN.find(t => t.id === pendingTyp)?.label}
                  </p>
                </div>
                {pendingTyp && AB_SUBS[pendingTyp].map(s => (
                  <button
                    key={s.id}
                    onClick={() => { onSelect(pendingTyp!, s.id); setOpen(false) }}
                    className={`flex items-center w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                      abTyp === pendingTyp && abSub === s.id
                        ? "bg-[#0d9488]/10 text-[#0d9488] font-medium"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </>
            )}
          </PopoverContent>
        </Popover>
      </TooltipTrigger>
      <TooltipContent side="right">{hasAb ? abLabel : "Einsatzort wählen"}</TooltipContent>
    </Tooltip>
  )
}

// ─────────────────────────────────────────────────────────
// PatientPopover — patient context slot (collapsed sidebar)
// Same pattern: Tooltip wraps Popover, tooltip hidden when popover open
// ─────────────────────────────────────────────────────────
function PatientPopover({
  patient, patientIndex, stationPatients,
  isPatientPinned, pinPatient, unpinPatient,
  navigatePatient, setPatientSearchOpen, setPatientFall,
}: {
  patient: PatientContext
  patientIndex: number
  stationPatients: PatientContext[]
  isPatientPinned: (id: string) => boolean
  pinPatient: (p: PatientContext) => void
  unpinPatient: (id: string) => void
  navigatePatient: (dir: "prev" | "next") => void
  setPatientSearchOpen: (v: boolean) => void
  setPatientFall: (f: Fall) => void
}) {
  const [open, setOpen] = useState(false)
  const pinned = isPatientPinned(patient.patientId)

  return (
    <Tooltip disableHoverableContent={open}>
      <TooltipTrigger asChild>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-md text-navbar-foreground hover:bg-navbar-hover transition-colors"
              aria-label="Patient"
            >
              <UserRound className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="right" align="start" className="w-64 p-0" onOpenAutoFocus={e => e.preventDefault()}>
            {/* Name header */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b">
              <span className="text-sm font-semibold text-foreground flex-1 truncate">{patient.name}</span>
              <button
                onClick={() => { pinned ? unpinPatient(patient.patientId) : pinPatient(patient) }}
                className={`flex h-5 w-5 items-center justify-center rounded transition-colors shrink-0 ${
                  pinned ? "text-mh-blau" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Pin className="h-3 w-3" />
              </button>
            </div>
            {/* Navigation row */}
            <div className="flex items-center gap-1 px-2 py-2 border-b">
              <button
                onClick={() => navigatePatient("prev")}
                disabled={stationPatients.length <= 1}
                className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="flex-1 text-center text-xs text-muted-foreground">
                St. {patient.station} &nbsp;·&nbsp; {patientIndex + 1} / {stationPatients.length}
              </span>
              <button
                onClick={() => navigatePatient("next")}
                disabled={stationPatients.length <= 1}
                className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors shrink-0"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            {/* Fall list */}
            <div className="py-1">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Fälle
              </p>
              {patient.faelle.map(f => (
                <button
                  key={f.fallNummer}
                  onClick={() => { setPatientFall(f); setOpen(false) }}
                  className={`flex flex-col w-full px-3 py-1.5 text-left transition-colors ${
                    f.fallNummer === patient.aktiverFall.fallNummer ? "bg-muted" : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-foreground">{f.fallNummer}</span>
                    <Badge
                      variant={f.entlassung ? "secondary" : "default"}
                      className={`text-[9px] h-3.5 shrink-0 ${!f.entlassung ? "bg-[var(--mh-rot)] text-[#fff]" : ""}`}
                    >
                      {f.entlassung ? "Abgeschl." : "Aktiv"}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate">{f.fachabteilung}</span>
                </button>
              ))}
            </div>
            {/* Search link */}
            <div className="border-t px-2 py-1.5">
              <button
                onClick={() => { setPatientSearchOpen(true); setOpen(false) }}
                className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Search className="h-3.5 w-3.5 shrink-0" />
                Patient wechseln
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </TooltipTrigger>
      <TooltipContent side="right">{patient.name}</TooltipContent>
    </Tooltip>
  )
}

// ─────────────────────────────────────────────────────────
// Module rendering helpers
// ─────────────────────────────────────────────────────────
function ModuleButton({
  mod, active, collapsed, onClick,
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

// ─────────────────────────────────────────────────────────
// Überblick entry — shown as first item in the listen section
// Adapts label/icon/moduleId based on the active Arbeitsbereich
// ─────────────────────────────────────────────────────────
const UEBERBLICK_DEF: Record<string, { moduleId: string; label: string }> = {
  op:               { moduleId: "ueberblick-op",       label: "OP-Übersicht"       },
  ambulanz:         { moduleId: "ueberblick-ambulanz",  label: "Ambulanzliste"      },
  funktionsstellen: { moduleId: "ueberblick-funk",      label: "Funktionsübersicht" },
}
const UEBERBLICK_DEFAULT = { moduleId: "ueberblick-station", label: "Visite" }

function UeberblickEntry({
  abTyp, activeModule, collapsed, onModuleClick,
}: {
  abTyp: AbTypId | null
  activeModule: string
  collapsed: boolean
  onModuleClick: (id: string) => void
}) {
  const def = (abTyp && UEBERBLICK_DEF[abTyp]) ?? UEBERBLICK_DEFAULT
  const active = activeModule === def.moduleId

  const inner = (
    <button
      onClick={() => onModuleClick(def.moduleId)}
      className={`flex items-center gap-2.5 w-full rounded-md transition-colors mb-0.5 ${
        collapsed ? "h-8 w-8 justify-center mx-auto" : "px-2.5 py-1.5"
      } ${
        active
          ? "bg-navbar-active text-navbar-active-foreground font-semibold"
          : "text-navbar-foreground hover:bg-navbar-hover hover:text-navbar-active-foreground"
      }`}
    >
      <ListChecks className="h-4 w-4 shrink-0 text-[#0d9488]" />
      {!collapsed && (
        <>
          <span className="text-sm flex-1 text-left">{def.label}</span>
          <span className="text-[9px] rounded px-1 py-0.5 font-semibold uppercase tracking-wide bg-[#0d9488]/15 text-[#0d9488] leading-none">
            Start
          </span>
        </>
      )}
    </button>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right">{def.label}</TooltipContent>
      </Tooltip>
    )
  }
  return inner
}

function ModuleList({
  modules, activeModule, collapsed, onModuleClick,
}: {
  modules: { id: string; label: string; icon: string }[]
  activeModule: string
  collapsed: boolean
  onModuleClick: (id: string) => void
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {modules.map(mod => (
        <ModuleButton
          key={mod.id}
          mod={mod}
          active={activeModule === mod.id}
          collapsed={collapsed}
          onClick={() => onModuleClick(mod.id)}
        />
      ))}
    </div>
  )
}

function GroupedModuleList({
  groups, activeModule, collapsed, onModuleClick,
}: {
  groups: { label: string; modules: ModuleItem[] }[]
  activeModule: string
  collapsed: boolean
  onModuleClick: (id: string) => void
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
            collapsed={collapsed}
            onModuleClick={onModuleClick}
          />
        </div>
      ))}
    </div>
  )
}

function OpPatientNav({
  activeModule, activeEncounterIndex, collapsed, onModuleClick,
}: {
  activeModule: string
  activeEncounterIndex: number
  collapsed: boolean
  onModuleClick: (id: string) => void
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
        collapsed={collapsed}
        onModuleClick={onModuleClick}
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
        collapsed={collapsed}
        onModuleClick={onModuleClick}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Pinned patients section (shared)
// ─────────────────────────────────────────────────────────
function PinnedPatientsSection({
  pinnedPatients, patient, collapsed,
  openPinnedPatient, unpinPatient, reorderPinnedPatients,
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
      <div
        className="flex flex-col max-h-36 overflow-y-auto navbar-scroll"
        onDragOver={e => e.preventDefault()}
      >
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

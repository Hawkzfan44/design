"use client"

import { useRef, useState, useEffect, useMemo } from "react"
import { useShell, arbeitskontextDisplayLabel } from "@/lib/shell-context"
import { ARBEITSLISTEN_MODULE, PATIENTEN_MODULE, KLINIKEN, PROFILE, SPRACHEN, SYSTEM_CONFIG, DEMO_PATIENTEN } from "@/lib/types"
import type { PatientContext } from "@/lib/types"
import {
  ArrowLeft, User, Monitor, Globe, Sun, Moon,
  Search, AlertTriangle, IterationCcw,
  FileText, Hash, X, Circle, Layers,
} from "lucide-react"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

// Demo documents for search
const DEMO_DOKUMENTE = [
  { docId: "D-001", title: "Arztbrief Entlassung", patientId: "P-10001", fallNummer: "F-2026-1001" },
  { docId: "D-002", title: "OP-Bericht Appendektomie", patientId: "P-10002", fallNummer: "F-2026-1042" },
  { docId: "D-003", title: "Befund Laborwerte", patientId: "P-10003", fallNummer: "F-2026-1055" },
  { docId: "D-004", title: "Pflegebericht Station 3A", patientId: "P-10005", fallNummer: "F-2026-1088" },
  { docId: "D-005", title: "Radiologie Befund Thorax", patientId: "P-20001", fallNummer: "F-2026-2001" },
]

type ResultType = "patient" | "fall" | "dokument"
interface SearchResult {
  type: ResultType
  label: string
  sublabel: string
  patientData: typeof DEMO_PATIENTEN[number]
  fallNummer?: string
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
}

export function Topbar() {
  const {
    activeModule,
    patient, clearPatient,
    returnTo,
    user, updateUser,
    parkedChain, returnToChain,
    openPatientAdHoc,
    arbeitskontextTyp, arbeitskontextEinheit,
    behandlungskontext, endBehandlungskontext,
    contextPanelOpen, toggleContextPanel,
  } = useShell()

  const allModules = [...ARBEITSLISTEN_MODULE, ...PATIENTEN_MODULE]
  const activeModuleDef = allModules.find(m => m.id === activeModule)
  const activeKlinik = KLINIKEN.find(k => k.id === user.klinikId)
  const showBackButton = returnTo != null

  // ── Inline search ─────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("")
  const [searchFocused, setSearchFocused] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  useEffect(() => {
    if (!searchFocused) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [searchFocused])

  const searchResults = useMemo<SearchResult[]>(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    const res: SearchResult[] = []
    for (const p of DEMO_PATIENTEN) {
      if (p.name.toLowerCase().includes(q) || p.patientId.toLowerCase().includes(q)) {
        res.push({ type: "patient", label: p.name, sublabel: `${p.patientId} | St. ${p.station} Zi. ${p.zimmer}`, patientData: p })
      }
      for (const f of p.faelle) {
        if (f.fallNummer.toLowerCase().includes(q)) {
          res.push({ type: "fall", label: f.fallNummer, sublabel: `${p.name} | ${f.fachabteilung}`, patientData: p, fallNummer: f.fallNummer })
        }
      }
    }
    for (const doc of DEMO_DOKUMENTE) {
      if (doc.title.toLowerCase().includes(q) || doc.docId.toLowerCase().includes(q)) {
        const p = DEMO_PATIENTEN.find(pt => pt.patientId === doc.patientId)
        if (p) res.push({ type: "dokument", label: doc.title, sublabel: `${p.name} | ${doc.fallNummer}`, patientData: p, fallNummer: doc.fallNummer })
      }
    }
    return res.slice(0, 8)
  }, [searchQuery])

  const handleSelectResult = (r: SearchResult) => {
    const p = r.patientData
    const aktiverFall = r.fallNummer
      ? p.faelle.find(f => f.fallNummer === r.fallNummer) ?? p.faelle.find(f => !f.entlassung) ?? p.faelle[0]
      : p.faelle.find(f => !f.entlassung) ?? p.faelle[0]
    const ctx: PatientContext = { patientId: p.patientId, name: p.name, geburtsdatum: p.geburtsdatum, geschlecht: p.geschlecht, station: p.station, faelle: p.faelle, aktiverFall }
    openPatientAdHoc(ctx)
    setSearchQuery("")
    setSearchFocused(false)
  }

  const typeIcon = (t: ResultType) => {
    switch (t) {
      case "patient": return <User className="h-3.5 w-3.5" />
      case "fall": return <Hash className="h-3.5 w-3.5" />
      case "dokument": return <FileText className="h-3.5 w-3.5" />
    }
  }

  // ── Layer 2 chip label ─────────────────────────────────
  const { label: layer2Label, quelle: layer2Quelle } = arbeitskontextDisplayLabel(
    user.arbeitsplatz,
    arbeitskontextTyp,
    arbeitskontextEinheit,
  )
  // Active (non-default) = explicitly chosen OR implicitly derived from a non-station Arbeitsplatz
  const layer2Active = arbeitskontextTyp !== "none" || layer2Quelle === "implizit" && !layer2Label.startsWith("Station")

  return (
    <TooltipProvider delayDuration={300}>
    <div className="flex flex-col shrink-0">
      {/* Test System Banner */}
      {SYSTEM_CONFIG.isTestSystem && (
        <div className="flex items-center justify-center gap-2 h-6 bg-mh-rot text-[#fff] text-[11px] font-bold tracking-wide select-none shrink-0">
          <AlertTriangle className="h-3 w-3" />
          <span>{SYSTEM_CONFIG.testBannerText}</span>
          <AlertTriangle className="h-3 w-3" />
        </div>
      )}

      {/* Main Topbar */}
      <header className="flex items-center h-11 bg-topbar border-b border-topbar-border px-3 gap-2 shrink-0 min-w-0">

        {/* Left: Logo + back / parked chain */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="hidden md:block text-sm font-bold text-topbar-foreground tracking-tight select-none mr-1">
            Web M-KIS
          </span>

          {showBackButton && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={clearPatient}
                  className="flex items-center gap-1 shrink-0 rounded-md px-1.5 py-1 text-xs text-topbar-foreground/70 hover:text-topbar-foreground hover:bg-topbar-hover transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline truncate max-w-[100px]">{returnTo!.label}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>{returnTo!.label}</TooltipContent>
            </Tooltip>
          )}

          {parkedChain && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={returnToChain}
                  className="flex items-center gap-1.5 shrink-0 rounded-md px-2 py-1 text-xs font-medium bg-mh-blau/15 text-[var(--mh-grau)] dark:text-mh-blau hover:bg-mh-blau/25 border border-mh-blau/30 transition-colors"
                >
                  <IterationCcw className="h-3 w-3 shrink-0" />
                  <span className="hidden sm:inline truncate max-w-[140px]">
                    {parkedChain.patient.name}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent>Zurück zur Stationsliste: {parkedChain.patient.name}</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Context chip strip — Layer 1 (static) + Layer 2 + Layer 3 + Layer 4 */}
        <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto no-scrollbar">

          {/* Layer 1 — static, always visible, purple/indigo tone */}
          <div className="hidden lg:flex items-center gap-1 shrink-0">
            <span className="inline-flex items-center h-5 rounded px-1.5 text-[10px] font-medium bg-[#4f46e5]/15 text-[#4f46e5] dark:bg-[#4f46e5]/20 dark:text-[#a5b4fc] select-none whitespace-nowrap">
              {user.vollname.replace("Dr. med. ", "Dr. ")}
            </span>
            <span className="inline-flex items-center h-5 rounded px-1.5 text-[10px] font-medium bg-[#4f46e5]/15 text-[#4f46e5] dark:bg-[#4f46e5]/20 dark:text-[#a5b4fc] select-none whitespace-nowrap">
              {activeKlinik?.kurzname ?? user.mandant}
            </span>
            <span className="inline-flex items-center h-5 rounded px-1.5 text-[10px] font-medium bg-[#4f46e5]/15 text-[#4f46e5] dark:bg-[#4f46e5]/20 dark:text-[#a5b4fc] select-none whitespace-nowrap">
              {user.arbeitsplatz}
            </span>
            <span className="mx-0.5 h-4 w-px bg-topbar-border/50 shrink-0" />
          </div>

          {/* Layer 2 — Arbeitsbereich chip (green when non-default, gray when Station default) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`inline-flex items-center h-5 rounded px-1.5 text-[10px] font-medium shrink-0 whitespace-nowrap select-none ${
                layer2Active
                  ? "bg-[#0d9488]/15 text-[#0d9488] dark:bg-[#0d9488]/20 dark:text-[#5eead4]"
                  : "bg-topbar-border/30 text-topbar-foreground/60"
              }`}>
                {layer2Label}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">Arbeitsbereich (Layer 2)</TooltipContent>
          </Tooltip>

          {/* Layer 3 — Patientenkontext chip (blue, only when patient active) */}
          {patient && (
            <>
              <span className="mx-0.5 h-4 w-px bg-topbar-border/50 shrink-0" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={clearPatient}
                    className="inline-flex items-center gap-1 h-5 rounded px-1.5 text-[10px] font-medium bg-[#1d6fb8]/15 text-[#1d6fb8] dark:bg-[#1d6fb8]/20 dark:text-[#7dd3fc] hover:bg-[#1d6fb8]/25 transition-colors shrink-0 whitespace-nowrap"
                  >
                    {patient.name} &nbsp;·&nbsp; {patient.aktiverFall.fallNummer}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Patientenkontext (Layer 3) — Klicken zum Verlassen</TooltipContent>
              </Tooltip>
            </>
          )}

          {/* Layer 4 — Behandlungskontext indicator (amber, only when active) */}
          {behandlungskontext && (
            <>
              <span className="mx-0.5 h-4 w-px bg-topbar-border/50 shrink-0" />
              <span className="inline-flex items-center gap-1 h-5 rounded px-1.5 text-[10px] font-medium bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 shrink-0 whitespace-nowrap select-none">
                <Circle className="h-2 w-2 fill-current shrink-0" />
                {behandlungskontext.label} &nbsp;·&nbsp; {formatTime(behandlungskontext.startedAt)}
                <button
                  onClick={endBehandlungskontext}
                  className="ml-0.5 hover:text-amber-800 dark:hover:text-amber-200 transition-colors"
                  aria-label="Behandlungskontext beenden"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            </>
          )}
        </div>

        {/* Center: Inline search */}
        <div className="shrink-0 w-48 lg:w-64 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-topbar-foreground/40 pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            placeholder="Suchen... (Ctrl+K)"
            className="w-full h-7 rounded-md border border-topbar-border/50 bg-topbar-hover/40 pl-8 pr-2 text-xs text-topbar-foreground placeholder:text-topbar-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring focus:bg-background transition-colors"
          />
          {/* Dropdown results */}
          {searchFocused && searchQuery.trim() && (
            <div
              ref={dropdownRef}
              className="absolute top-full right-0 mt-1 z-50 rounded-lg border bg-popover shadow-lg overflow-hidden w-80"
            >
              {searchResults.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Keine Ergebnisse.</p>
              ) : (
                <div className="max-h-64 overflow-y-auto py-1">
                  {searchResults.map((r, i) => (
                    <button
                      key={`${r.type}-${i}`}
                      onClick={() => handleSelectResult(r)}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-muted transition-colors"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        {typeIcon(r.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-foreground truncate">{r.label}</span>
                          <Badge variant="secondary" className="text-[9px] h-3.5 shrink-0">
                            {r.type === "patient" ? "Patient" : r.type === "fall" ? "Fall" : "Dokument"}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">{r.sublabel}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Kontext panel toggle + User avatar */}
        <div className="flex items-center gap-1 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleContextPanel}
                className={`flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium transition-colors ${
                  contextPanelOpen
                    ? "bg-[#4f46e5]/15 text-[#4f46e5] dark:bg-[#4f46e5]/20 dark:text-[#a5b4fc]"
                    : "text-topbar-foreground/60 hover:text-topbar-foreground hover:bg-topbar-hover"
                }`}
                aria-label="Kontextpanel umschalten"
              >
                <Layers className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Kontext</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Kontextstack anzeigen</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center shrink-0">
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-topbar-hover transition-colors">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-mh-grau text-primary-foreground">
                  <User className="h-3 w-3" />
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-0">
              <div className="px-3 py-2.5 border-b bg-muted/30">
                <p className="text-sm font-semibold text-foreground">{user.vollname}</p>
                <p className="text-[11px] text-muted-foreground">{user.benutzername} | {user.mandant}</p>
              </div>
              <div className="p-2.5 flex flex-col gap-2.5">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Klinik</label>
                  <Select value={user.klinikId} onValueChange={v => updateUser({ klinikId: v })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {KLINIKEN.map(k => (<SelectItem key={k.id} value={k.id} className="text-xs">{k.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Profil / Ansicht</label>
                  <Select value={user.profilId} onValueChange={v => updateUser({ profilId: v })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROFILE.filter(p => user.freigegebeneProfile.includes(p.id)).map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Sprache</label>
                  <Select value={user.spracheId} onValueChange={v => updateUser({ spracheId: v })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SPRACHEN.map(s => (<SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <Separator className="my-0.5" />
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Farbschema</label>
                  <div className="flex rounded-md border p-0.5">
                    <button
                      onClick={() => updateUser({ farbschema: "light" })}
                      className={`flex-1 flex items-center justify-center gap-1 rounded py-1 text-xs font-medium transition-colors ${user.farbschema === "light" ? "bg-secondary text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <Sun className="h-3 w-3" /> Light
                    </button>
                    <button
                      onClick={() => updateUser({ farbschema: "dark" })}
                      className={`flex-1 flex items-center justify-center gap-1 rounded py-1 text-xs font-medium transition-colors ${user.farbschema === "dark" ? "bg-secondary text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <Moon className="h-3 w-3" /> Dark
                    </button>
                  </div>
                </div>
                <Separator className="my-0.5" />
                <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1.5"><Monitor className="h-3 w-3 shrink-0" /><span>Arbeitsplatz: {user.arbeitsplatz}</span></div>
                  <div className="flex items-center gap-1.5"><Globe className="h-3 w-3 shrink-0" /><span>Zeitzone: {user.zeitzone}</span></div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

      </header>
    </div>
    </TooltipProvider>
  )
}

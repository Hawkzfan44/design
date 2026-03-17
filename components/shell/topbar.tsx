"use client"

import { useRef, useState, useEffect, useMemo } from "react"
import { useShell } from "@/lib/shell-context"
import { ARBEITSLISTEN_MODULE, PATIENTEN_MODULE, KLINIKEN, PROFILE, SPRACHEN, SYSTEM_CONFIG, DEMO_PATIENTEN } from "@/lib/types"
import { FAP_LISTE } from "@/lib/shell-context"
import type { PatientContext } from "@/lib/types"
import type { FapId } from "@/lib/shell-context"
import {
  ArrowLeft, User, Building2, Monitor, Globe, Sun, Moon,
  ChevronDown, Search, AlertTriangle, IterationCcw,
  FileText, Hash,
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

export function Topbar() {
  const {
    activeModule,
    patient, clearPatient,
    returnTo,
    user, updateUser,
    parkedChain, returnToChain,
    openPatientAdHoc,
    activeFap, setActiveFap,
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

  // Ctrl+K shortcut
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

  // Close dropdown on outside click
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
      <header className="flex items-center h-11 bg-topbar border-b border-topbar-border px-3 gap-2 shrink-0">
        {/* Left: Back / chain return / module name */}
        <div className="flex items-center gap-1.5 min-w-0 shrink-0">
          {showBackButton && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={clearPatient}
                  className="flex items-center gap-1 shrink-0 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline truncate max-w-[120px]">{returnTo!.label}</span>
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
                  <span className="hidden sm:inline truncate max-w-[200px]">
                    Stationsliste: {parkedChain.patient.name}
                  </span>
                  <span className="sm:hidden">Zurueck</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>Zurueck zur Stationsliste: {parkedChain.patient.name}</TooltipContent>
            </Tooltip>
          )}

          <h1 className="text-sm font-semibold text-topbar-foreground truncate">
            {activeModuleDef?.label ?? activeModule}
          </h1>
        </div>

        {/* Center: Inline search */}
        <div className="flex-1 flex justify-center min-w-0 px-2">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              placeholder="Patient, Fallnr., Dokument suchen... (Ctrl+K)"
              className="w-full h-7 rounded-md border border-input bg-background pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
            />
            {/* Dropdown results */}
            {searchFocused && searchQuery.trim() && (
              <div
                ref={dropdownRef}
                className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border bg-popover shadow-lg overflow-hidden"
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
                            <Badge variant="secondary" className="text-[9px] h-3.5 shrink-0">{r.type === "patient" ? "Patient" : r.type === "fall" ? "Fall" : "Dokument"}</Badge>
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
        </div>

        {/* Right: Compact vertical Klinik/AP + FAP chip + User */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Klinik + Arbeitsplatz + FAP stacked */}
          <div className="hidden md:flex flex-col gap-0 mr-1">
            {/* Row 1: Klinik */}
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[90px] leading-tight cursor-default">
                    {activeKlinik?.kurzname ?? user.klinikId}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{activeKlinik?.name ?? user.klinikId}</TooltipContent>
              </Tooltip>
            </div>
            {/* Row 2: Arbeitsplatz */}
            <div className="flex items-center gap-1.5">
              <Monitor className="h-3 w-3 text-muted-foreground/70 shrink-0" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-[10px] text-muted-foreground/70 truncate max-w-[90px] leading-tight cursor-default">
                    {user.arbeitsplatz}
                  </span>
                </TooltipTrigger>
                <TooltipContent>Arbeitsplatz: {user.arbeitsplatz}</TooltipContent>
              </Tooltip>
            </div>
            {/* Row 3: FAP chip */}
            <FapChip activeFap={activeFap} setActiveFap={setActiveFap} />
          </div>

          {/* User profile popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-secondary transition-colors">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-mh-grau text-primary-foreground">
                  <User className="h-3 w-3" />
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground hidden md:block" />
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

// ── FAP Chip ─────────────────────────────────────────────
function FapChip({ activeFap, setActiveFap }: { activeFap: FapId; setActiveFap: (id: FapId) => void }) {
  const [open, setOpen] = useState(false)
  const activeDef = FAP_LISTE.find(f => f.id === activeFap) ?? FAP_LISTE[0]
  const hasFap = activeFap !== "none"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`flex items-center gap-1 mt-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium leading-none transition-colors ${
            hasFap
              ? "bg-[#0d9488]/20 text-[#0d9488] border border-[#0d9488]/40 hover:bg-[#0d9488]/30"
              : "text-muted-foreground/60 hover:text-muted-foreground border border-transparent hover:border-border"
          }`}
          aria-label="FAP auswählen"
        >
          <span className="truncate max-w-[80px]">{activeDef.kurzlabel}</span>
          <ChevronDown className="h-2.5 w-2.5 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-1">
        <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          Funktionsarbeitsplatz
        </p>
        {FAP_LISTE.map(fap => (
          <button
            key={fap.id}
            onClick={() => { setActiveFap(fap.id); setOpen(false) }}
            className={`flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
              activeFap === fap.id
                ? fap.id === "none"
                  ? "bg-muted text-foreground"
                  : "bg-[#0d9488]/15 text-[#0d9488] font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {activeFap === fap.id && (
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${fap.id === "none" ? "bg-muted-foreground" : "bg-[#0d9488]"}`} />
            )}
            {activeFap !== fap.id && <span className="h-1.5 w-1.5 shrink-0" />}
            {fap.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

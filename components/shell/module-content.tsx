"use client"

import { useState, useEffect, useRef } from "react"
import { useShell } from "@/lib/shell-context"
import type { BehandlungskontextTyp, Behandlungskontext } from "@/lib/shell-context"
import { BEHANDLUNGSKONTEXT_LABELS } from "@/lib/shell-context"
import { StationslisteModule } from "./stationsliste-module"
import {
  PackageCheck, Receipt, ClipboardList,
  Pill, Activity, Stethoscope, FileText,
  Square, Circle,
  Baby, Bandage, Clock, ChevronDown, Plus,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { resolveBehandlungskontexte } from "@/lib/shell-context"

// ── Placeholder module ───────────────────────────────────
function PlaceholderModule({ title, icon: Icon }: { title: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <Icon className="h-8 w-8" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm mt-1">Modul-Platzhalter — Inhalt wird hier geladen.</p>
      </div>
    </div>
  )
}

const MODULE_MAP: Record<string, { title: string; icon: React.ComponentType<{ className?: string }> }> = {
  "kommissionierung":   { title: "Kommissionierung",    icon: PackageCheck },
  "abrechnung-liste":   { title: "Abrechnung (Listen)", icon: Receipt },
  "stellliste":         { title: "Stellliste",          icon: ClipboardList },
  "verordnungen":       { title: "Verordnungen",        icon: Pill },
  "kurve":              { title: "Kurve",               icon: Activity },
  "diagnosen":          { title: "Diagnosen",           icon: Stethoscope },
  "dokumentation":      { title: "Dokumentation",       icon: FileText },
  "abrechnung-patient": { title: "Abrechnung (Patient)", icon: Receipt },
  "befunde":            { title: "Befunde",             icon: Activity },
  "op-who-signin":      { title: "WHO Sign In",         icon: ClipboardList },
  "op-who-timeout":     { title: "WHO Team Timeout",    icon: ClipboardList },
  "op-who-signout":     { title: "WHO Sign Out",        icon: ClipboardList },
  "op-basisdaten":      { title: "Basisdaten",          icon: FileText },
  "op-diagnosen":       { title: "Diagnosen",           icon: Stethoscope },
  "op-personal":        { title: "Personal",            icon: ClipboardList },
  "op-pflegedoku":      { title: "Pflege",              icon: FileText },
  "op-arztdoku":        { title: "Arztdoku",            icon: FileText },
  "op-material":        { title: "Material",            icon: PackageCheck },
  "op-bericht":         { title: "OP-Bericht",          icon: FileText },
  "op-liste":           { title: "OP-Liste",            icon: ClipboardList },
  "saalbelegung":       { title: "Saalbelegung",        icon: Activity },
  "aufgaben-op":        { title: "Aufgaben (OP)",       icon: ClipboardList },
  "terminliste":        { title: "Terminliste",         icon: ClipboardList },
  "warteliste":         { title: "Warteliste",          icon: ClipboardList },
  "aufgaben-ambulanz":  { title: "Aufgaben (Ambulanz)", icon: ClipboardList },
  "untersuchungsliste": { title: "Untersuchungsliste",  icon: ClipboardList },
  "aufgaben-funk":      { title: "Aufgaben",            icon: ClipboardList },
  // Überblick list entries
  "ueberblick-station": { title: "Stationsübersicht",   icon: ClipboardList },
  "ueberblick-op":      { title: "OP-Übersicht",        icon: ClipboardList },
  "ueberblick-ambulanz":{ title: "Ambulanzübersicht",   icon: ClipboardList },
  "ueberblick-funk":    { title: "Funktionsübersicht",  icon: ClipboardList },
}

// Demo Patientenobjekte
const DEMO_PATIENTENOBJEKTE: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string }[]> = {
  "P-10001": [{ icon: Bandage, label: "Wunde re. Unterschenkel" }],
  "P-10004": [{ icon: Baby,    label: "Schwangerschaft 32. SSW" }],
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
}

function formatDateLabel(ts: number) {
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return `heute ${formatTime(ts)}`
  if (d.toDateString() === yesterday.toDateString()) return `gestern ${formatTime(ts)}`
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function formatAge(geburtsdatum: string) {
  const birth = new Date(geburtsdatum)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

// ─────────────────────────────────────────────────────────
// PatientHeader — InfoView with local Behandlungskontext
// ─────────────────────────────────────────────────────────
function PatientHeader() {
  const {
    patient,
    clearPatient,
    behandlungskontextIntent,
    clearBehandlungskontextIntent,
    behandlungskontextHistoryMap,
    persistBehandlungskontext,
    arbeitskontextTyp,
    arbeitskontextEinheit,
  } = useShell()

  // ── Local Behandlungskontext state ───────────────────────
  const [aktiv, setAktiv] = useState<Behandlungskontext | null>(null)
  // history is read from the persistent Shell map for the current patient
  const patientId = patient?.patientId
  const history: Behandlungskontext[] = patientId ? (behandlungskontextHistoryMap[patientId] ?? []) : []

  const prevPatientIdRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    const isNewPatient = patientId !== prevPatientIdRef.current
    prevPatientIdRef.current = patientId

    if (behandlungskontextIntent && patientId) {
      const entry: Behandlungskontext = {
        typ: behandlungskontextIntent,
        label: BEHANDLUNGSKONTEXT_LABELS[behandlungskontextIntent],
        startedAt: Date.now(),
      }
      setAktiv(entry)
      persistBehandlungskontext(patientId, entry)
      clearBehandlungskontextIntent()
    } else if (isNewPatient) {
      // New patient opened without intent — just clear local aktiv, history comes from map
      setAktiv(null)
    }
  }, [patientId, behandlungskontextIntent]) // eslint-disable-line react-hooks/exhaustive-deps

  const endBehandlungskontext = () => {
    if (!aktiv || !patientId) return
    const ended = { ...aktiv, endedAt: Date.now() }
    persistBehandlungskontext(patientId, ended)
    setAktiv(null)
  }

  // Auto-end Behandlungskontext silently when leaving the patient
  const handleClearPatient = () => {
    if (aktiv) endBehandlungskontext()
    clearPatient()
  }

  // Available Behandlungskontext types for the current Arbeitsbereich
  const verfuegbareTypen = resolveBehandlungskontexte(
    patient?.aktiverFall?.station ?? "",
    arbeitskontextTyp,
    arbeitskontextEinheit,
  )

  const openKontext = (entry: Behandlungskontext) => {
    if (!patientId) return
    // End current if switching
    if (aktiv) {
      const ended = { ...aktiv, endedAt: Date.now() }
      persistBehandlungskontext(patientId, ended)
    }
    setAktiv(entry)
    persistBehandlungskontext(patientId, entry)
  }

  const startNeuerKontext = (typ: BehandlungskontextTyp) => {
    if (!patientId) return
    const entry: Behandlungskontext = {
      typ,
      label: BEHANDLUNGSKONTEXT_LABELS[typ],
      startedAt: Date.now(),
    }
    openKontext(entry)
  }

  if (!patient) return null

  const patientenobjekte = DEMO_PATIENTENOBJEKTE[patient.patientId] ?? []
  const age = formatAge(patient.geburtsdatum)
  const finishedHistory = history.filter(h => h.endedAt)

  // Dropdown items: past instances (most recent first) + separator + Neu erstellen
  const pastInstances = [...history].reverse().filter(h => h.endedAt)

  return (
    <>
      {/* Amber bar — active Behandlungskontext */}
      {aktiv && (
        <div className="flex items-center gap-2 px-4 py-1 bg-amber-50 border-b border-amber-200/70 dark:bg-amber-950/20 dark:border-amber-800/50 shrink-0">
          <Circle className="h-1.5 w-1.5 fill-amber-500 text-amber-500 shrink-0" />
          <span className="text-xs text-amber-700 dark:text-amber-400">
            {aktiv.label} seit {formatTime(aktiv.startedAt)}
          </span>
          {/* wechseln dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-1 text-[10px] text-amber-600/70 hover:text-amber-700 dark:text-amber-500/70 dark:hover:text-amber-400 underline underline-offset-2 transition-colors">
                wechseln
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <KontextDropdownItems
                past={pastInstances}
                verfuegbareTypen={verfuegbareTypen}
                onSelectPast={openKontext}
                onNeu={startNeuerKontext}
              />
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={endBehandlungskontext}
            className="ml-auto flex items-center gap-1 text-[10px] text-amber-600/70 hover:text-amber-700 dark:text-amber-500/70 dark:hover:text-amber-400 transition-colors"
          >
            <Square className="h-2.5 w-2.5" />
            Beenden
          </button>
        </div>
      )}

      {/* Patient info bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/20 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1d6fb8]/10 text-[#1d6fb8]">
            <span className="text-xs font-bold">{patient.name.charAt(0)}</span>
          </div>
          <div className="min-w-0 flex-1">
            {/* First line: name, age, fall, location */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground truncate">{patient.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {age} J. · {patient.geschlecht === "M" ? "m" : patient.geschlecht === "W" ? "w" : "d"}
              </span>
              <Badge variant="outline" className="text-[10px] h-4 shrink-0 font-mono">
                {patient.aktiverFall.fallNummer}
              </Badge>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {patient.aktiverFall.fachabteilung} · St. {patient.station}
              </span>
            </div>
            {/* Second line: Besonderheiten + history badges + Kontext-wählen */}
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {patientenobjekte.map((obj, i) => (
                <TooltipProvider key={i} delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors border border-border/50">
                        <obj.icon className="h-2.5 w-2.5 shrink-0" />
                        {obj.label}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">Besonderheit</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}

              {/* Finished Behandlungskontext history badges */}
              {finishedHistory.map((h, i) => (
                <button
                  key={i}
                  onClick={() => openKontext({ ...h, startedAt: Date.now(), endedAt: undefined })}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200/70 hover:bg-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/50 transition-colors"
                  title="Klicken zum erneuten Öffnen"
                >
                  <Clock className="h-2.5 w-2.5 shrink-0" />
                  {h.label} {formatTime(h.startedAt)}–{formatTime(h.endedAt!)}
                </button>
              ))}

              {/* "Kontext wählen" — only shown when no active context */}
              {!aktiv && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border border-dashed border-border/70 hover:border-border hover:text-foreground transition-colors">
                      <Plus className="h-2.5 w-2.5 shrink-0" />
                      Kontext wählen
                      <ChevronDown className="h-2.5 w-2.5 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <KontextDropdownItems
                      past={pastInstances}
                      verfuegbareTypen={verfuegbareTypen}
                      onSelectPast={openKontext}
                      onNeu={startNeuerKontext}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── KontextDropdownItems — shared between the two dropdown triggers ──
function KontextDropdownItems({
  past,
  verfuegbareTypen,
  onSelectPast,
  onNeu,
}: {
  past: Behandlungskontext[]
  verfuegbareTypen: import("@/lib/shell-context").BehandlungskontextDef[]
  onSelectPast: (entry: Behandlungskontext) => void
  onNeu: (typ: BehandlungskontextTyp) => void
}) {
  return (
    <>
      {past.length > 0 && (
        <>
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Frühere Kontexte
          </DropdownMenuLabel>
          {past.map((h, i) => (
            <DropdownMenuItem
              key={i}
              onClick={() => onSelectPast({ ...h, startedAt: Date.now(), endedAt: undefined })}
              className="flex items-center gap-2 text-xs"
            >
              <Clock className="h-3 w-3 text-amber-500 shrink-0" />
              <span className="flex-1">{h.label}</span>
              <span className="text-muted-foreground text-[10px]">{formatDateLabel(h.startedAt)}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
        </>
      )}
      {verfuegbareTypen.length > 0 ? (
        <>
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Neu erstellen
          </DropdownMenuLabel>
          {verfuegbareTypen.map(def => (
            <DropdownMenuItem
              key={def.typ}
              onClick={() => onNeu(def.typ)}
              className="flex items-center gap-2 text-xs"
            >
              <Plus className="h-3 w-3 text-muted-foreground shrink-0" />
              {def.label}
            </DropdownMenuItem>
          ))}
        </>
      ) : (
        <>
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Neu erstellen
          </DropdownMenuLabel>
          {(["visite", "untersuchung", "aufnahme"] as BehandlungskontextTyp[]).map(typ => (
            <DropdownMenuItem
              key={typ}
              onClick={() => onNeu(typ)}
              className="flex items-center gap-2 text-xs"
            >
              <Plus className="h-3 w-3 text-muted-foreground shrink-0" />
              {BEHANDLUNGSKONTEXT_LABELS[typ]}
            </DropdownMenuItem>
          ))}
        </>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────
// ModuleContent — main content area
// ─────────────────────────────────────────────────────────
export function ModuleContent() {
  const { activeModule, patient, viewMode } = useShell()

  const renderModule = () => {
    if (activeModule === "stationsliste") return <StationslisteModule />
    if (activeModule === "ueberblick-station")
      return <StationslisteModule autoBehandlungskontext="visite" returnModuleId="ueberblick-station" returnLabel="Visite" />
    if (activeModule === "ueberblick-op")
      return <StationslisteModule autoBehandlungskontext="op" returnModuleId="ueberblick-op" returnLabel="OP-Übersicht" />
    if (activeModule === "ueberblick-ambulanz")
      return <StationslisteModule autoBehandlungskontext="untersuchung" returnModuleId="ueberblick-ambulanz" returnLabel="Ambulanzliste" />
    if (activeModule === "ueberblick-funk")
      return <StationslisteModule autoBehandlungskontext="untersuchung" returnModuleId="ueberblick-funk" returnLabel="Funktionsübersicht" />
    const mod = MODULE_MAP[activeModule]
    if (mod) return <PlaceholderModule title={mod.title} icon={mod.icon} />
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Unbekanntes Modul: {activeModule}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {patient && viewMode === "patient" && <PatientHeader />}
      <div className="flex-1 overflow-auto">
        {renderModule()}
      </div>
    </div>
  )
}

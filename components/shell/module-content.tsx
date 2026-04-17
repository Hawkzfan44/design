"use client"

import { useState, useEffect } from "react"
import { useShell } from "@/lib/shell-context"
import type { BehandlungskontextTyp, Behandlungskontext } from "@/lib/shell-context"
import { BEHANDLUNGSKONTEXT_LABELS } from "@/lib/shell-context"
import { StationslisteModule } from "./stationsliste-module"
import {
  PackageCheck, Receipt, ClipboardList,
  Pill, Activity, Stethoscope, FileText,
  Square, AlertTriangle, Circle,
  Baby, Bandage, Clock,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"

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
  } = useShell()

  // ── Local Behandlungskontext state ───────────────────────
  const [aktiv, setAktiv] = useState<Behandlungskontext | null>(null)
  const [history, setHistory] = useState<Behandlungskontext[]>([])
  const [confirmClose, setConfirmClose] = useState(false)

  // Consume intent whenever it changes (set by list modules on patient open)
  useEffect(() => {
    if (!behandlungskontextIntent) return
    const entry: Behandlungskontext = {
      typ: behandlungskontextIntent,
      label: BEHANDLUNGSKONTEXT_LABELS[behandlungskontextIntent],
      startedAt: Date.now(),
    }
    setAktiv(entry)
    setHistory([entry])
    clearBehandlungskontextIntent()
  }, [behandlungskontextIntent]) // eslint-disable-line react-hooks/exhaustive-deps

  // When patient changes without an intent, reset local state
  const patientId = patient?.patientId
  useEffect(() => {
    if (!behandlungskontextIntent) {
      setAktiv(null)
      setHistory([])
    }
  }, [patientId]) // eslint-disable-line react-hooks/exhaustive-deps

  const endBehandlungskontext = () => {
    if (!aktiv) return
    const ended = { ...aktiv, endedAt: Date.now() }
    setHistory(prev => prev.map(e => e.startedAt === aktiv.startedAt ? ended : e))
    setAktiv(null)
  }

  const handleClearPatient = () => {
    if (aktiv) { setConfirmClose(true) } else { clearPatient() }
  }

  if (!patient) return null

  const patientenobjekte = DEMO_PATIENTENOBJEKTE[patient.patientId] ?? []
  const age = formatAge(patient.geburtsdatum)

  return (
    <>
      {/* Amber bar — only when Behandlungskontext is active */}
      {aktiv && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 border-b border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 shrink-0">
          <Circle className="h-2 w-2 fill-amber-500 text-amber-500 shrink-0" />
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
            {aktiv.label} — seit {formatTime(aktiv.startedAt)}
          </span>
          <span className="ml-auto text-[10px] text-amber-600/70 dark:text-amber-500/70 italic hidden sm:block">
            Dokumentationen diesem Behandlungskontext zugeordnet
          </span>
          <button
            onClick={endBehandlungskontext}
            className="flex items-center gap-1 ml-2 rounded-md px-2 py-1 text-[11px] font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60 transition-colors border border-amber-200 dark:border-amber-700 shrink-0"
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
          <div className="min-w-0">
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
            {patientenobjekte.length > 0 && (
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
                      <TooltipContent side="bottom" className="text-xs">
                        Patientenobjekt — klicken öffnet Spezialmodul
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Behandlungskontext history (compact) */}
        {history.length > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span className="hidden sm:inline">
                    {history[history.length - 1].label}
                    {history[history.length - 1].endedAt
                      ? ` · ${formatTime(history[history.length - 1].endedAt!)}`
                      : " (aktiv)"}
                  </span>
                  {history.length > 1 && (
                    <span className="ml-0.5 rounded-full bg-muted px-1 text-[9px]">+{history.length - 1}</span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="p-2 flex flex-col gap-1 max-w-[220px]">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                  Behandlungskontext-Verlauf
                </p>
                {history.map((h, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <Circle className={`h-1.5 w-1.5 shrink-0 ${h.endedAt ? "text-muted-foreground" : "fill-amber-500 text-amber-500"}`} />
                    <span className={h.endedAt ? "text-muted-foreground" : "text-foreground font-medium"}>
                      {h.label}
                    </span>
                    <span className="ml-auto text-muted-foreground text-[10px]">
                      {formatTime(h.startedAt)}
                      {h.endedAt ? `–${formatTime(h.endedAt)}` : ""}
                    </span>
                  </div>
                ))}
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Confirmation: patient has open Behandlungskontext */}
      <Dialog open={confirmClose} onOpenChange={setConfirmClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Behandlungskontext noch offen
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{aktiv?.label}</span> ist noch aktiv.
            Soll er beim Verlassen des Patienten geschlossen werden?
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmClose(false)}>
              Offen lassen
            </Button>
            <Button size="sm" onClick={() => { endBehandlungskontext(); clearPatient(); setConfirmClose(false) }}>
              Schließen &amp; weiter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─────────────────────────────────────────────────────────
// ModuleContent — main content area
// ─────────────────────────────────────────────────────────
export function ModuleContent() {
  const { activeModule, patient } = useShell()

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
      {patient && <PatientHeader />}
      <div className="flex-1 overflow-auto">
        {renderModule()}
      </div>
    </div>
  )
}

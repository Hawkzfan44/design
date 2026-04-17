"use client"

import { useState } from "react"
import { useShell } from "@/lib/shell-context"
import type { SituationsTyp } from "@/lib/shell-context"
import { StationslisteModule } from "./stationsliste-module"
import {
  PackageCheck, Receipt, ClipboardList,
  Pill, Activity, Stethoscope, FileText,
  Play, Square, AlertTriangle, Circle,
  Baby, Bandage,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"

// Placeholder module
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
  "kommissionierung":   { title: "Kommissionierung",   icon: PackageCheck },
  "abrechnung-liste":   { title: "Abrechnung (Listen)", icon: Receipt },
  "stellliste":         { title: "Stellliste",          icon: ClipboardList },
  "verordnungen":       { title: "Verordnungen",        icon: Pill },
  "kurve":              { title: "Kurve",               icon: Activity },
  "diagnosen":          { title: "Diagnosen",           icon: Stethoscope },
  "dokumentation":      { title: "Dokumentation",       icon: FileText },
  "abrechnung-patient": { title: "Abrechnung (Patient)", icon: Receipt },
  "befunde":            { title: "Befunde",             icon: Activity },
  // OP modules
  "op-who-signin":  { title: "WHO Sign In",     icon: ClipboardList },
  "op-who-timeout": { title: "WHO Team Timeout", icon: ClipboardList },
  "op-who-signout": { title: "WHO Sign Out",    icon: ClipboardList },
  "op-basisdaten":  { title: "Basisdaten",      icon: FileText },
  "op-diagnosen":   { title: "Diagnosen",       icon: Stethoscope },
  "op-personal":    { title: "Personal",        icon: ClipboardList },
  "op-pflegedoku":  { title: "Pflege",          icon: FileText },
  "op-arztdoku":    { title: "Arztdoku",        icon: FileText },
  "op-material":    { title: "Material",        icon: PackageCheck },
  "op-bericht":     { title: "OP-Bericht",      icon: FileText },
  // Listen
  "op-liste":             { title: "OP-Liste",            icon: ClipboardList },
  "saalbelegung":         { title: "Saalbelegung",        icon: Activity },
  "aufgaben-op":          { title: "Aufgaben (OP)",       icon: ClipboardList },
  "terminliste":          { title: "Terminliste",         icon: ClipboardList },
  "warteliste":           { title: "Warteliste",          icon: ClipboardList },
  "aufgaben-ambulanz":    { title: "Aufgaben (Ambulanz)", icon: ClipboardList },
  "untersuchungsliste":   { title: "Untersuchungsliste",  icon: ClipboardList },
  "aufgaben-funk":        { title: "Aufgaben",            icon: ClipboardList },
}

// Demo Patientenobjekte — persistent clinical objects on a patient
// These are informational only; the shell does not manage their lifecycle
const DEMO_PATIENTENOBJEKTE: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string }[]> = {
  "P-10001": [
    { icon: Bandage, label: "Wunde re. Unterschenkel" },
  ],
  "P-10004": [
    { icon: Baby, label: "Schwangerschaft 32. SSW" },
  ],
}

const SITUATIONS_TYPEN: { id: SituationsTyp; label: string }[] = [
  { id: "visite",       label: "Visite starten" },
  { id: "aufnahme",     label: "Ärztliche Aufnahme" },
  { id: "untersuchung", label: "Untersuchung" },
]

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
// Patient header — shown above all patient modules
// ─────────────────────────────────────────────────────────
function PatientHeader() {
  const {
    patient,
    clearPatient,
    situationskontext,
    startSituationskontext,
    endSituationskontext,
  } = useShell()

  const [confirmClose, setConfirmClose] = useState(false)

  if (!patient) return null

  const patientenobjekte = DEMO_PATIENTENOBJEKTE[patient.patientId] ?? []
  const age = formatAge(patient.geburtsdatum)
  const hasSituation = situationskontext !== null

  const handleClearPatient = () => {
    if (hasSituation) {
      setConfirmClose(true)
    } else {
      clearPatient()
    }
  }

  return (
    <>
      {/* View C: Situationskontext active indicator bar */}
      {hasSituation && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 border-b border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 shrink-0">
          <Circle className="h-2 w-2 fill-amber-500 text-amber-500 shrink-0" />
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
            {situationskontext!.label} — geöffnet {formatTime(situationskontext!.startedAt)}
          </span>
          <span className="ml-auto text-[10px] text-amber-600/70 dark:text-amber-500/70 italic">
            Alle Dokumentationen sind dieser Situation zugeordnet
          </span>
          <button
            onClick={endSituationskontext}
            className="flex items-center gap-1 ml-2 rounded-md px-2 py-1 text-[11px] font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60 transition-colors border border-amber-200 dark:border-amber-700 shrink-0"
          >
            <Square className="h-2.5 w-2.5" />
            Beenden
          </button>
        </div>
      )}

      {/* Patient info bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/20 shrink-0">
        {/* Name + meta */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1d6fb8]/10 text-[#1d6fb8]">
            <span className="text-xs font-bold">{patient.name.charAt(0)}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground truncate">{patient.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">{age} J. · {patient.geschlecht === "M" ? "m" : patient.geschlecht === "W" ? "w" : "d"}</span>
              <Badge variant="outline" className="text-[10px] h-4 shrink-0 font-mono">
                {patient.aktiverFall.fallNummer}
              </Badge>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {patient.aktiverFall.fachabteilung} · St. {patient.station}
              </span>
            </div>
            {/* Patientenobjekte — informational badges */}
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

        {/* Right: Situation starten / beenden */}
        <div className="flex items-center gap-2 shrink-0">
          {!hasSituation ? (
            /* View B: start situation dropdown */
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center rounded-md border border-border overflow-hidden">
                    <button
                      onClick={() => startSituationskontext("visite")}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <Play className="h-3 w-3 text-muted-foreground" />
                      Visite starten
                    </button>
                    <div className="w-px h-5 bg-border" />
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="flex items-center px-1.5 py-1.5 hover:bg-muted transition-colors">
                            <span className="text-[10px] font-bold text-muted-foreground leading-none">▾</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="p-1 flex flex-col gap-0.5">
                          {SITUATIONS_TYPEN.map(s => (
                            <button
                              key={s.id}
                              onClick={() => startSituationskontext(s.id)}
                              className="text-left text-xs px-2 py-1.5 rounded hover:bg-muted transition-colors whitespace-nowrap"
                            >
                              {s.label}
                            </button>
                          ))}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Situationskontext öffnen (Layer 4) — für forensische Zuordnung
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
      </div>

      {/* Confirmation dialog: clear patient with open Situationskontext */}
      <Dialog open={confirmClose} onOpenChange={setConfirmClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Situation noch offen
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Die{" "}
            <span className="font-medium text-foreground">
              {situationskontext?.label}
            </span>{" "}
            ist noch geöffnet. Soll sie jetzt geschlossen werden?
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmClose(false)}
            >
              Offen lassen
            </Button>
            <Button
              size="sm"
              onClick={() => {
                endSituationskontext()
                clearPatient()
                setConfirmClose(false)
              }}
            >
              Schließen &amp; weiter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─────────────────────────────────────────────────────────
// Main module content area
// ─────────────────────────────────────────────────────────
export function ShellLayout({ children }: { children?: React.ReactNode }) {
  const { patient } = useShell()
  return (
    <div className="flex flex-col h-full">
      {patient && <PatientHeader />}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}

export function ModuleContent() {
  const { activeModule, patient } = useShell()

  const renderModule = () => {
    if (activeModule === "stationsliste") return <StationslisteModule />
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

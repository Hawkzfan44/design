"use client"

import { useShell } from "@/lib/shell-context"
import { StationslisteModule } from "./stationsliste-module"
import {
  PackageCheck, Receipt, ClipboardList,
  Pill, Activity, Stethoscope, FileText,
} from "lucide-react"

// Placeholder module
function PlaceholderModule({ title, icon: Icon }: { title: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <Icon className="h-8 w-8" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm mt-1">Modul-Platzhalter -- Inhalt wird hier geladen.</p>
      </div>
    </div>
  )
}

const MODULE_MAP: Record<string, { title: string; icon: React.ComponentType<{ className?: string }> }> = {
  "kommissionierung": { title: "Kommissionierung", icon: PackageCheck },
  "abrechnung-liste": { title: "Abrechnung (Listen)", icon: Receipt },
  "stellliste": { title: "Stellliste", icon: ClipboardList },
  "verordnungen": { title: "Verordnungen", icon: Pill },
  "kurve": { title: "Kurve", icon: Activity },
  "diagnosen": { title: "Diagnosen", icon: Stethoscope },
  "dokumentation": { title: "Dokumentation", icon: FileText },
  "abrechnung-patient": { title: "Abrechnung (Patient)", icon: Receipt },
}

export function ModuleContent() {
  const { activeModule } = useShell()

  // Stationsliste has a real implementation
  if (activeModule === "stationsliste") {
    return <StationslisteModule />
  }

  // All other modules get a placeholder
  const mod = MODULE_MAP[activeModule]
  if (mod) {
    return <PlaceholderModule title={mod.title} icon={mod.icon} />
  }

  return (
    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
      Unbekanntes Modul: {activeModule}
    </div>
  )
}

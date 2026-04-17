"use client"

import { useShell, arbeitskontextDisplayLabel, ARBEITSBEREICH_TYPEN, BEHANDLUNGSKONTEXT_PRO_ARBEITSBEREICH } from "@/lib/shell-context"
import { KLINIKEN } from "@/lib/types"
import { Baby, Bandage, CheckCircle2, Clock, X } from "lucide-react"

// Demo Patientenobjekte (same as in module-content)
const DEMO_PATIENTENOBJEKTE: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string }[]> = {
  "P-10001": [{ icon: Bandage,  label: "Wunde re. Unterschenkel" }],
  "P-10004": [{ icon: Baby,     label: "Schwangerschaft 32. SSW" }],
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
}

function LayerHeader({ label, color }: { label: string; color: string }) {
  return (
    <div className={`text-[9px] font-bold uppercase tracking-widest mb-1.5 ${color}`}>
      {label}
    </div>
  )
}

function Row({ label, value, muted }: { label?: string; value: string; muted?: boolean }) {
  return (
    <div className={`text-[11px] leading-snug ${muted ? "text-muted-foreground italic" : "text-foreground"}`}>
      {label && <span className="text-muted-foreground">{label}: </span>}
      {value}
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-border/50 my-3" />
}

export function ContextPanel() {
  const {
    contextPanelOpen, toggleContextPanel,
    user,
    arbeitskontextTyp, arbeitskontextEinheit,
    patient,
    behandlungskontext,
  } = useShell()

  if (!contextPanelOpen) return null

  const klinik = KLINIKEN.find(k => k.id === user.klinikId)
  const { label: abLabel, quelle: abQuelle } = arbeitskontextDisplayLabel(
    user.arbeitsplatz,
    arbeitskontextTyp,
    arbeitskontextEinheit,
  )

  // Resolve effective ArbeitskontextTyp for Behandlungskontext availability check
  let effectiveTyp = arbeitskontextTyp
  if (effectiveTyp === "none") {
    // station AP-Station3A-01 stays "none" = Station
  }
  const verfuegbareBehandlungskontexte = BEHANDLUNGSKONTEXT_PRO_ARBEITSBEREICH[effectiveTyp] ?? []

  const patientenobjekte = patient ? (DEMO_PATIENTENOBJEKTE[patient.patientId] ?? []) : []

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-l bg-muted/20 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b bg-background/60">
        <span className="text-xs font-semibold text-foreground tracking-tight">Kontextstack</span>
        <button
          onClick={toggleContextPanel}
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Panel schließen"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-col px-3 py-3 gap-0">

        {/* ── Layer 1 — Benutzerkontext ── */}
        <LayerHeader label="Layer 1 — Benutzerkontext" color="text-[#4f46e5]" />
        <div className="rounded-lg border border-[#4f46e5]/20 bg-[#4f46e5]/5 px-2.5 py-2 flex flex-col gap-1 mb-0">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-[#4f46e5] shrink-0" />
            <span className="text-[11px] font-medium text-foreground truncate">{user.vollname}</span>
          </div>
          <Row label="Mandant"     value={klinik?.name ?? user.mandant} />
          <Row label="Arbeitsplatz" value={user.arbeitsplatz} />
          <Row label="Profil"      value={user.profilId === "arzt" ? "Arzt" : "Pflege"} />
        </div>

        <Divider />

        {/* ── Layer 2 — Arbeitskontext ── */}
        <LayerHeader label="Layer 2 — Arbeitskontext" color="text-[#0d9488]" />
        <div className="rounded-lg border border-[#0d9488]/20 bg-[#0d9488]/5 px-2.5 py-2 flex flex-col gap-1 mb-0">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-[#0d9488] shrink-0" />
            <span className="text-[11px] font-medium text-foreground truncate">{abLabel}</span>
          </div>
          <Row
            label="Quelle"
            value={abQuelle === "implizit" ? "implizit aus Arbeitsplatz" : "explizit gewählt"}
            muted={abQuelle === "implizit"}
          />
          {verfuegbareBehandlungskontexte.length > 0 ? (
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Behandlungskontexte:{" "}
              {verfuegbareBehandlungskontexte.map(bk => (
                <span key={bk.typ} className="inline-block mr-1">
                  {bk.label}
                  <span className="opacity-50 ml-0.5">({bk.verfuegbarkeit})</span>
                </span>
              ))}
            </div>
          ) : (
            <Row value="Kein Behandlungskontext definiert" muted />
          )}
        </div>

        <Divider />

        {/* ── Layer 3 — Patientenkontext ── */}
        <LayerHeader label="Layer 3 — Patientenkontext" color="text-[#1d6fb8]" />
        <div className={`rounded-lg border px-2.5 py-2 flex flex-col gap-1 mb-0 ${
          patient
            ? "border-[#1d6fb8]/20 bg-[#1d6fb8]/5"
            : "border-border bg-muted/30"
        }`}>
          {patient ? (
            <>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-[#1d6fb8] shrink-0" />
                <span className="text-[11px] font-medium text-foreground truncate">{patient.name}</span>
              </div>
              <Row label="Patient-ID"  value={patient.patientId} />
              <Row label="Fall"        value={patient.aktiverFall.fallNummer} />
              <Row label="Abteilung"   value={patient.aktiverFall.fachabteilung} />
              <Row label="Station"     value={`St. ${patient.station}`} />
            </>
          ) : (
            <Row value="— kein Patient ausgewählt" muted />
          )}
        </div>

        <Divider />

        {/* ── Layer 4 — Behandlungskontext ── */}
        <LayerHeader label="Layer 4 — Behandlungskontext" color="text-amber-600" />
        <div className={`rounded-lg border px-2.5 py-2 flex flex-col gap-1 mb-0 ${
          behandlungskontext
            ? "border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700/30"
            : "border-border bg-muted/30"
        }`}>
          {behandlungskontext ? (
            <>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-amber-600 shrink-0" />
                <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                  {behandlungskontext.label}
                </span>
              </div>
              <Row label="Gestartet" value={formatTime(behandlungskontext.startedAt)} />
            </>
          ) : verfuegbareBehandlungskontexte.length === 0 ? (
            <Row value="— nicht verfügbar in diesem Arbeitsbereich" muted />
          ) : (
            <Row value="— kein Behandlungskontext aktiv" muted />
          )}
        </div>

        <Divider />

        {/* ── Patientenobjekte (informational) ── */}
        <LayerHeader label="Patientenobjekte" color="text-muted-foreground" />
        <div className="rounded-lg border border-border bg-muted/30 px-2.5 py-2 flex flex-col gap-1 mb-0">
          {patientenobjekte.length > 0 ? patientenobjekte.map((obj, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <obj.icon className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-[11px] text-foreground">{obj.label}</span>
            </div>
          )) : (
            <Row value="— keine Patientenobjekte" muted />
          )}
        </div>

      </div>
    </aside>
  )
}

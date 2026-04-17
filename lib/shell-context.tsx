"use client"

import React, { createContext, useContext, useState, useCallback, useEffect } from "react"
import type {
  ViewMode, PatientContext, ReturnTo, UserContext, StationsPatient,
  Fall, PinnedPatient,
} from "./types"
import { ARBEITSLISTEN_MODULE, PATIENTEN_MODULE } from "./types"

// ── Parked Chain ────────────────────────────────────────
interface ParkedChain {
  patient: PatientContext
  moduleId: string
  stationPatients: StationsPatient[]
  patientIndex: number
}

// ── Arbeitskontext ──────────────────────────────────────
// ArbeitskontextTyp = functional area type (was: FapType)
export type ArbeitskontextTyp = "none" | "op" | "ambulanz" | "funk" | "zna" | "abrechnung" | "kodierung"

// ArbeitskontextEinheit = specific room/device within an ArbeitskontextTyp (was: FapUnit)
export interface ArbeitskontextEinheit {
  id: string
  label: string   // short
  full: string    // full display
}

export interface ArbeitskontextTypDefinition {
  id: ArbeitskontextTyp
  label: string
  kurzlabel: string
  einheiten: ArbeitskontextEinheit[]
}

// UI label = "Arbeitsbereich"; domain term = Arbeitskontext
export const ARBEITSBEREICH_TYPEN: ArbeitskontextTypDefinition[] = [
  {
    id: "none",
    label: "Station (implizit)",
    kurzlabel: "Station 3A",
    einheiten: [],
  },
  {
    id: "op",
    label: "OP",
    kurzlabel: "OP",
    einheiten: [
      { id: "kopf-op",          label: "Kopf-OP",           full: "OP · Kopf-OP" },
      { id: "extremitaeten-op", label: "Extremitäten-OP",   full: "OP · Extremitäten-OP" },
      { id: "wirbelsaeule",     label: "Wirbelsäulen-OP",   full: "OP · Wirbelsäulen-OP" },
      { id: "becken-bein",      label: "Becken-Bein",       full: "OP · Becken-Bein-Einheit" },
    ],
  },
  {
    id: "ambulanz",
    label: "Ambulanz",
    kurzlabel: "Ambulanz",
    einheiten: [
      { id: "chirurgisch",  label: "Chirurgische Amb.",   full: "Chirurgische Ambulanz" },
      { id: "orthopaedie",  label: "Orthopädische Amb.",  full: "Orthopädische Ambulanz" },
      { id: "medizinisch",  label: "Medizinische Amb.",   full: "Medizinische Ambulanz" },
      { id: "kardiologie",  label: "Kardiologische Amb.", full: "Kardiologische Ambulanz" },
    ],
  },
  {
    id: "zna",
    label: "ZNA",
    kurzlabel: "ZNA",
    einheiten: [
      { id: "zna-allgemein", label: "Allgemein", full: "ZNA · Allgemein" },
    ],
  },
  {
    id: "funk",
    label: "Funktionsstellen",
    kurzlabel: "Funktionsstellen",
    einheiten: [
      { id: "radiologie",        label: "Radiologie",        full: "Radiologie" },
      { id: "endoskopie",        label: "Endoskopie",        full: "Endoskopie" },
      { id: "labor",             label: "Labor",             full: "Labor" },
      { id: "herzkatheterlabor", label: "Herzkatheterlabor", full: "Herzkatheterlabor" },
    ],
  },
  {
    id: "abrechnung",
    label: "Abrechnung",
    kurzlabel: "Abrechnung",
    einheiten: [],
  },
  {
    id: "kodierung",
    label: "Kodierung",
    kurzlabel: "Kodierung",
    einheiten: [],
  },
]

// ── Arbeitsplatz (physical device) ─────────────────────
// A known Arbeitsplatz can implicitly set the Arbeitsbereich.
export interface ArbeitsplatzDefinition {
  id: string
  label: string
  // If set, this Arbeitsplatz implicitly derives Arbeitsbereich
  implizitTyp?: ArbeitskontextTyp
  implizitEinheit?: string
  implizitLabel?: string  // display label for the derived Arbeitsbereich
}

export const ARBEITSPLATZ_LISTE: ArbeitsplatzDefinition[] = [
  {
    id: "AP-Station3A-01",
    label: "AP-Station3A-01",
    // Station 3A is the home base — Arbeitsbereich = Station (none/default)
    implizitTyp: "none",
    implizitEinheit: "",
    implizitLabel: "Station · 3A",
  },
  {
    id: "AP-OP-Saal3-01",
    label: "AP-OP-Saal3-01",
    // A fixed OP terminal: always sets Arbeitsbereich to OP · Saal 3
    implizitTyp: "op",
    implizitEinheit: "kopf-op",
    implizitLabel: "OP · Saal 3",
  },
]

// Helper: derive Arbeitsbereich display label from Arbeitsplatz or explicit selection
export function arbeitskontextDisplayLabel(
  arbeitsplatz: string,
  explizitTyp: ArbeitskontextTyp,
  explizitEinheit: string,
): { label: string; quelle: "implizit" | "explizit" } {
  // If user has explicitly chosen something other than none → show it
  if (explizitTyp !== "none") {
    const typDef = ARBEITSBEREICH_TYPEN.find(t => t.id === explizitTyp)
    const einheit = typDef?.einheiten.find(e => e.id === explizitEinheit)
    const label = einheit ? einheit.full : (typDef?.kurzlabel ?? explizitTyp)
    return { label, quelle: "explizit" }
  }
  // Check if Arbeitsplatz implicitly sets a non-default Arbeitsbereich
  const ap = ARBEITSPLATZ_LISTE.find(a => a.id === arbeitsplatz)
  if (ap?.implizitTyp && ap.implizitTyp !== "none" && ap.implizitLabel) {
    return { label: ap.implizitLabel, quelle: "implizit" }
  }
  // Default: Station from Arbeitsplatz name
  const stationMatch = arbeitsplatz.match(/Station(\w+)-/)
  const stationLabel = stationMatch ? `Station · ${stationMatch[1]}` : "Station 3A"
  return { label: stationLabel, quelle: "implizit" }
}

// Derive legacy FapId from ArbeitskontextTyp for module resolution
export type FapId = "none" | "op-saal3" | "ambulanz-zimmer2" | "mrt-geraet1" | "endoskopie-raum2"

export function deriveArbeitskontextFapId(typ: ArbeitskontextTyp, einheitId: string): FapId {
  if (typ === "op")       return "op-saal3"
  if (typ === "ambulanz") return "ambulanz-zimmer2"
  if (typ === "funk") {
    if (einheitId === "endoskopie") return "endoskopie-raum2"
    return "mrt-geraet1"
  }
  return "none"
}

// ── Behandlungskontext (Layer 4) ────────────────────────
export type BehandlungskontextTyp = "visite" | "schmerzvisite" | "aufnahme" | "triage" | "untersuchung" | "roentgen" | "ct" | "mrt" | "op"

export interface Behandlungskontext {
  typ: BehandlungskontextTyp
  label: string        // e.g. "Visite"
  startedAt: number   // Unix timestamp ms
}

// Defines which Behandlungskontexte are available per Arbeitsbereich
export type BehandlungskontextVerfuegbarkeit = "pflicht" | "optional"

export interface BehandlungskontextDef {
  typ: BehandlungskontextTyp
  label: string
  verfuegbarkeit: BehandlungskontextVerfuegbarkeit
}

export const BEHANDLUNGSKONTEXT_PRO_ARBEITSBEREICH: Record<ArbeitskontextTyp, BehandlungskontextDef[]> = {
  none: [
    { typ: "visite",       label: "Visite",        verfuegbarkeit: "optional" },
    { typ: "schmerzvisite",label: "Schmerzvisite",  verfuegbarkeit: "optional" },
  ],
  op: [
    { typ: "op",           label: "OP",             verfuegbarkeit: "pflicht" },
  ],
  ambulanz: [
    { typ: "untersuchung", label: "Untersuchung",   verfuegbarkeit: "optional" },
  ],
  zna: [
    { typ: "aufnahme",     label: "Aufnahme",       verfuegbarkeit: "pflicht" },
    { typ: "triage",       label: "Triage",         verfuegbarkeit: "pflicht" },
    { typ: "untersuchung", label: "Untersuchung",   verfuegbarkeit: "optional" },
  ],
  funk: [
    { typ: "roentgen",     label: "Röntgen",        verfuegbarkeit: "pflicht" },
    { typ: "ct",           label: "CT",             verfuegbarkeit: "pflicht" },
    { typ: "mrt",          label: "MRT",            verfuegbarkeit: "pflicht" },
    { typ: "untersuchung", label: "Untersuchung",   verfuegbarkeit: "pflicht" },
  ],
  abrechnung: [],   // no Behandlungskontext
  kodierung:  [],   // no Behandlungskontext
}

// Resolve which Behandlungskontext types are available given the current Arbeitskontext
// Respects Arbeitsplatz implicit derivation
export function resolveBehandlungskontexte(
  arbeitsplatz: string,
  explizitTyp: ArbeitskontextTyp,
  explizitEinheit: string,
): BehandlungskontextDef[] {
  // Effective Arbeitskontext
  let effectiveTyp = explizitTyp
  if (effectiveTyp === "none") {
    const ap = ARBEITSPLATZ_LISTE.find(a => a.id === arbeitsplatz)
    if (ap?.implizitTyp && ap.implizitTyp !== "none") {
      effectiveTyp = ap.implizitTyp
    }
  }
  // Funk sub-type refinement: Labor has no Behandlungskontext
  if (effectiveTyp === "funk" && explizitEinheit === "labor") return []
  return BEHANDLUNGSKONTEXT_PRO_ARBEITSBEREICH[effectiveTyp] ?? []
}

// ── Context Shape ───────────────────────────────────────
interface ShellContextValue {
  viewMode: ViewMode
  setViewMode: (m: ViewMode) => void

  activeModule: string
  setActiveModule: (id: string) => void

  collapsed: boolean
  toggleCollapsed: () => void

  patient: PatientContext | null
  openPatient: (p: PatientContext, from?: ReturnTo) => void
  openPatientAdHoc: (p: PatientContext) => void
  clearPatient: () => void
  setPatientFall: (f: Fall) => void

  stationPatients: StationsPatient[]
  setStationPatients: (list: StationsPatient[]) => void
  navigatePatient: (dir: "prev" | "next") => void
  patientIndex: number

  parkedChain: ParkedChain | null
  returnToChain: () => void

  pinnedPatients: PinnedPatient[]
  pinPatient: (p: PatientContext) => void
  unpinPatient: (patientId: string) => void
  openPinnedPatient: (patientId: string) => void
  isPatientPinned: (patientId: string) => boolean
  reorderPinnedPatients: (fromIndex: number, toIndex: number) => void
  pinPatientFromStation: (sp: StationsPatient) => void

  returnTo: ReturnTo | null

  user: UserContext
  updateUser: (partial: Partial<UserContext>) => void

  patientSearchOpen: boolean
  setPatientSearchOpen: (v: boolean) => void

  globalSearchOpen: boolean
  setGlobalSearchOpen: (v: boolean) => void

  // Arbeitskontext (was: FAP — kept as FapId for module resolution compat)
  activeFap: FapId
  setActiveFap: (id: FapId) => void

  arbeitskontextTyp: ArbeitskontextTyp
  setArbeitskontextTyp: (t: ArbeitskontextTyp) => void
  arbeitskontextEinheit: string
  setArbeitskontextEinheit: (e: string) => void

  activeEncounterIndex: number
  setActiveEncounterIndex: (i: number) => void

  // Layer 4 – Behandlungskontext (was: Situationskontext)
  behandlungskontext: Behandlungskontext | null
  startBehandlungskontext: (typ: BehandlungskontextTyp) => void
  endBehandlungskontext: () => void

  // Context panel visibility (right side panel)
  contextPanelOpen: boolean
  toggleContextPanel: () => void
}

const ShellContext = createContext<ShellContextValue | null>(null)

export function useShell() {
  const ctx = useContext(ShellContext)
  if (!ctx) throw new Error("useShell must be used within ShellProvider")
  return ctx
}

// ── Default User ────────────────────────────────────────
const DEFAULT_USER: UserContext = {
  benutzername: "m.schmidt",
  vollname: "Dr. med. Martin Schmidt",
  mandant: "Asklepios",
  klinikId: "barmbek",
  profilId: "arzt",
  freigegebeneProfile: ["arzt", "pflege"],
  arbeitsplatz: "AP-Station3A-01",
  spracheId: "de",
  zeitzone: "Europe/Berlin",
  farbschema: "light",
}

// ── Behandlungskontext labels ───────────────────────────
const BEHANDLUNGSKONTEXT_LABELS: Record<BehandlungskontextTyp, string> = {
  visite:       "Visite",
  schmerzvisite:"Schmerzvisite",
  aufnahme:     "Ärztliche Aufnahme",
  triage:       "Triage",
  untersuchung: "Untersuchung",
  roentgen:     "Röntgen",
  ct:           "CT",
  mrt:          "MRT",
  op:           "OP",
}

// ── Provider ────────────────────────────────────────────
export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [viewMode, setViewModeRaw] = useState<ViewMode>("listen")
  const [activeModule, setActiveModuleRaw] = useState("stationsliste")
  const [collapsed, setCollapsed] = useState(false)
  const [patient, setPatient] = useState<PatientContext | null>(null)
  const [stationPatients, setStationPatients] = useState<StationsPatient[]>([])
  const [returnTo, setReturnTo] = useState<ReturnTo | null>(null)
  const [user, setUser] = useState<UserContext>(DEFAULT_USER)
  const [patientSearchOpen, setPatientSearchOpen] = useState(false)
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false)
  const [pinnedPatients, setPinnedPatients] = useState<PinnedPatient[]>([])
  const [parkedChain, setParkedChain] = useState<ParkedChain | null>(null)
  const [activeFap, setActiveFapRaw] = useState<FapId>("none")
  const [arbeitskontextTyp, setArbeitskontextTypRaw] = useState<ArbeitskontextTyp>("none")
  const [arbeitskontextEinheit, setArbeitskontextEinheitRaw] = useState<string>("")
  const [activeEncounterIndex, setActiveEncounterIndex] = useState(0)
  const [behandlungskontext, setBehandlungskontext] = useState<Behandlungskontext | null>(null)
  const [contextPanelOpen, setContextPanelOpen] = useState(false)

  const setArbeitskontextTyp = useCallback((t: ArbeitskontextTyp) => {
    const typDef = ARBEITSBEREICH_TYPEN.find(td => td.id === t)
    const defaultEinheit = typDef?.einheiten[0]?.id ?? ""
    setArbeitskontextTypRaw(t)
    setArbeitskontextEinheitRaw(defaultEinheit)
    setActiveFapRaw(deriveArbeitskontextFapId(t, defaultEinheit))
  }, [])

  const setArbeitskontextEinheit = useCallback((e: string) => {
    setArbeitskontextEinheitRaw(e)
    setActiveFapRaw(deriveArbeitskontextFapId(arbeitskontextTyp, e))
  }, [arbeitskontextTyp])

  const setActiveFap = useCallback((id: FapId) => {
    setActiveFapRaw(id)
  }, [])

  useEffect(() => {
    if (user.farbschema === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [user.farbschema])

  const setViewMode = useCallback((m: ViewMode) => {
    if (m === "patient" && !patient) {
      setPatientSearchOpen(true)
      return
    }
    setViewModeRaw(m)
    if (m === "listen") {
      setActiveModuleRaw(ARBEITSLISTEN_MODULE[0].id)
    } else if (m === "patient") {
      setActiveModuleRaw(PATIENTEN_MODULE[0].id)
    }
  }, [patient])

  const setActiveModule = useCallback((id: string) => {
    setActiveModuleRaw(id)
  }, [])

  const toggleCollapsed = useCallback(() => setCollapsed(c => !c), [])
  const toggleContextPanel = useCallback(() => setContextPanelOpen(c => !c), [])

  const openPatient = useCallback((p: PatientContext, from?: ReturnTo) => {
    setPatient(p)
    setReturnTo(from ?? null)
    setParkedChain(null)
    setViewModeRaw("patient")
    setActiveModuleRaw(PATIENTEN_MODULE[0].id)
  }, [])

  const openPatientAdHoc = useCallback((p: PatientContext) => {
    if (patient && stationPatients.length > 0) {
      const idx = stationPatients.findIndex(sp => sp.patientId === patient.patientId)
      setParkedChain({
        patient,
        moduleId: activeModule,
        stationPatients,
        patientIndex: idx >= 0 ? idx : 0,
      })
    }
    setPatient(p)
    setReturnTo(null)
    setViewModeRaw("patient")
    setActiveModuleRaw(PATIENTEN_MODULE[0].id)
  }, [patient, stationPatients, activeModule])

  const returnToChain = useCallback(() => {
    if (!parkedChain) return
    setPatient(parkedChain.patient)
    setStationPatients(parkedChain.stationPatients)
    setActiveModuleRaw(parkedChain.moduleId)
    setViewModeRaw("patient")
    setReturnTo({ moduleId: "stationsliste", label: "Stationsliste" })
    setParkedChain(null)
  }, [parkedChain])

  const clearPatient = useCallback(() => {
    const rt = returnTo
    setPatient(null)
    setReturnTo(null)
    setParkedChain(null)
    setViewModeRaw("listen")
    if (rt) {
      setActiveModuleRaw(rt.moduleId)
    } else {
      setActiveModuleRaw(ARBEITSLISTEN_MODULE[0].id)
    }
  }, [returnTo])

  const setPatientFall = useCallback((f: Fall) => {
    setPatient(prev => prev ? { ...prev, aktiverFall: f } : null)
  }, [])

  const patientIndex = patient
    ? stationPatients.findIndex(sp => sp.patientId === patient.patientId)
    : -1

  const navigatePatient = useCallback((dir: "prev" | "next") => {
    if (stationPatients.length === 0 || !patient) return
    const idx = stationPatients.findIndex(sp => sp.patientId === patient.patientId)
    if (idx < 0) return
    const newIdx = dir === "prev"
      ? (idx - 1 + stationPatients.length) % stationPatients.length
      : (idx + 1) % stationPatients.length
    const sp = stationPatients[newIdx]
    const aktiverFall = sp.faelle.find(f => !f.entlassung) ?? sp.faelle[0]
    setPatient({
      patientId: sp.patientId,
      name: sp.name,
      geburtsdatum: sp.geburtsdatum,
      geschlecht: sp.geschlecht,
      station: sp.station,
      faelle: sp.faelle,
      aktiverFall,
    })
  }, [stationPatients, patient])

  const pinPatient = useCallback((p: PatientContext) => {
    setPinnedPatients(prev => {
      if (prev.some(pp => pp.patient.patientId === p.patientId)) return prev
      return [...prev, { patient: p, moduleId: "verordnungen", pinnedAt: Date.now() }]
    })
  }, [])

  const unpinPatient = useCallback((patientId: string) => {
    setPinnedPatients(prev => prev.filter(pp => pp.patient.patientId !== patientId))
  }, [])

  const openPinnedPatient = useCallback((patientId: string) => {
    const pinned = pinnedPatients.find(pp => pp.patient.patientId === patientId)
    if (!pinned) return
    if (patient && stationPatients.length > 0) {
      const idx = stationPatients.findIndex(sp => sp.patientId === patient.patientId)
      setParkedChain({
        patient,
        moduleId: activeModule,
        stationPatients,
        patientIndex: idx >= 0 ? idx : 0,
      })
    }
    setPatient(pinned.patient)
    setViewModeRaw("patient")
    setActiveModuleRaw(pinned.moduleId)
    setReturnTo(null)
  }, [pinnedPatients, patient, stationPatients, activeModule])

  const isPatientPinned = useCallback((patientId: string) => {
    return pinnedPatients.some(pp => pp.patient.patientId === patientId)
  }, [pinnedPatients])

  const reorderPinnedPatients = useCallback((fromIndex: number, toIndex: number) => {
    setPinnedPatients(prev => {
      const updated = [...prev]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      return updated
    })
  }, [])

  const pinPatientFromStation = useCallback((sp: StationsPatient) => {
    setPinnedPatients(prev => {
      if (prev.some(pp => pp.patient.patientId === sp.patientId)) return prev
      const aktiverFall = sp.faelle.find(f => !f.entlassung) ?? sp.faelle[0]
      const ctx: PatientContext = {
        patientId: sp.patientId,
        name: sp.name,
        geburtsdatum: sp.geburtsdatum,
        geschlecht: sp.geschlecht,
        station: sp.station,
        faelle: sp.faelle,
        aktiverFall,
      }
      return [...prev, { patient: ctx, moduleId: "verordnungen", pinnedAt: Date.now() }]
    })
  }, [])

  // Layer 4 – Behandlungskontext
  const startBehandlungskontext = useCallback((typ: BehandlungskontextTyp) => {
    setBehandlungskontext({ typ, label: BEHANDLUNGSKONTEXT_LABELS[typ], startedAt: Date.now() })
  }, [])

  const endBehandlungskontext = useCallback(() => {
    setBehandlungskontext(null)
  }, [])

  const updateUser = useCallback((partial: Partial<UserContext>) => {
    setUser(prev => ({ ...prev, ...partial }))
  }, [])

  return (
    <ShellContext.Provider value={{
      viewMode, setViewMode,
      activeModule, setActiveModule,
      collapsed, toggleCollapsed,
      patient, openPatient, openPatientAdHoc, clearPatient, setPatientFall,
      stationPatients, setStationPatients, navigatePatient, patientIndex,
      parkedChain, returnToChain,
      pinnedPatients, pinPatient, unpinPatient, openPinnedPatient, isPatientPinned, reorderPinnedPatients, pinPatientFromStation,
      returnTo,
      user, updateUser,
      patientSearchOpen, setPatientSearchOpen,
      globalSearchOpen, setGlobalSearchOpen,
      activeFap, setActiveFap,
      arbeitskontextTyp, setArbeitskontextTyp,
      arbeitskontextEinheit, setArbeitskontextEinheit,
      activeEncounterIndex, setActiveEncounterIndex,
      behandlungskontext, startBehandlungskontext, endBehandlungskontext,
      contextPanelOpen, toggleContextPanel,
    }}>
      {children}
    </ShellContext.Provider>
  )
}

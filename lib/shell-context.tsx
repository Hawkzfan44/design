"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react"
import type {
  ViewMode, PatientContext, ReturnTo, UserContext, StationsPatient,
  Fall, PinnedPatient,
} from "./types"
import { ARBEITSLISTEN_MODULE, PATIENTEN_MODULE } from "./types"

// ── Parked Chain ────────────────────────────────────────
// When a doctor is stepping through a station list and gets interrupted
// (ad-hoc call), the chain state is parked so they can return instantly.
interface ParkedChain {
  patient: PatientContext
  moduleId: string
  stationPatients: StationsPatient[]
  patientIndex: number
}

// ── FAP (Funktionsarbeitsplatz) ─────────────────────────
// FapType is the type of functional workstation
export type FapType = "none" | "op" | "ambulanz" | "mrt" | "endoskopie"

// FapUnit is a specific room/device within a FapType
export interface FapUnit {
  id: string
  label: string   // short, e.g. "Saal 3"
  full: string    // full, e.g. "OP · Saal 3"
}

export interface FapTypeDefinition {
  id: FapType
  label: string          // e.g. "OP"
  kurzlabel: string      // for display when no unit selected
  units: FapUnit[]       // empty = no secondary selector
}

export const FAP_TYPEN: FapTypeDefinition[] = [
  { id: "none",       label: "Station (implizit)", kurzlabel: "Station 3A", units: [] },
  { id: "op",         label: "OP",                 kurzlabel: "OP",
    units: [
      { id: "holding",          label: "Holding",           full: "OP · Holding" },
      { id: "kopf-op",          label: "Kopf-OP",           full: "OP · Kopf-OP" },
      { id: "extremitaeten-op", label: "Extremitäten-OP",   full: "OP · Extremitäten-OP" },
      { id: "wirbelsaeule",     label: "Wirbelsäulen-OP",   full: "OP · Wirbelsäulen-OP" },
      { id: "becken-bein",      label: "Becken-Bein-Einheit", full: "OP · Becken-Bein-Einheit" },
      { id: "aufwachraum",      label: "Aufwachraum",       full: "OP · Aufwachraum" },
    ]
  },
  { id: "ambulanz",   label: "Ambulanz",            kurzlabel: "Ambulanz",
    units: [
      { id: "chirurgisch",    label: "Chirurgische Amb.",    full: "Chirurgische Ambulanz" },
      { id: "orthopaedie",    label: "Orthopädische Amb.",   full: "Orthopädische Ambulanz" },
      { id: "medizinisch",    label: "Medizinische Amb.",    full: "Medizinische Ambulanz" },
      { id: "kardiologie",    label: "Kardiologische Amb.",  full: "Kardiologische Ambulanz" },
    ]
  },
  { id: "mrt",        label: "Funktionsstellen",    kurzlabel: "Funktionsstellen",
    units: [
      { id: "radiologie",     label: "Radiologie",          full: "Radiologie" },
      { id: "endoskopie",     label: "Endoskopie",          full: "Endoskopie" },
      { id: "labor",          label: "Labor",               full: "Labor" },
      { id: "herzkatheterlabor", label: "Herzkatheterlabor", full: "Herzkatheterlabor" },
    ]
  },
  // endoskopie id kept for legacy compat, maps to Funktionsstellen sub-type
  { id: "endoskopie", label: "Endoskopie",           kurzlabel: "Endoskopie", units: [] },
]

// Legacy FapId kept for backward compat with module selectors
export type FapId = "none" | "op-saal3" | "ambulanz-zimmer2" | "mrt-geraet1" | "endoskopie-raum2"

// Derive a legacy FapId from type+unit for module resolution
export function deriveFapId(type: FapType, unitId: string): FapId {
  if (type === "op")         return "op-saal3"       // treat all OP saals as OP context
  if (type === "ambulanz")   return "ambulanz-zimmer2"
  if (type === "mrt")        return "mrt-geraet1"
  return "none"
}

// For the topbar badge display
export function fapDisplayLabel(type: FapType, unitId: string): string {
  const typeDef = FAP_TYPEN.find(t => t.id === type)
  if (!typeDef) return "Station 3A"
  if (type === "none") return typeDef.kurzlabel
  const unit = typeDef.units.find(u => u.id === unitId)
  return unit ? unit.full : typeDef.kurzlabel
}

// Keep FAP_LISTE for any remaining callers (topbar read-only badge)
export interface FapDefinition {
  id: FapId
  label: string
  kurzlabel: string
}
export const FAP_LISTE: FapDefinition[] = [
  { id: "none",              label: "— Kein FAP (Station implizit)", kurzlabel: "Station 3A" },
  { id: "op-saal3",          label: "OP · Saal 3",                   kurzlabel: "OP · Saal 3" },
  { id: "ambulanz-zimmer2",  label: "Ambulanz · Zimmer 2",           kurzlabel: "Ambulanz · Zi. 2" },
  { id: "mrt-geraet1",       label: "MRT · Gerät 1",                 kurzlabel: "MRT · Gerät 1" },
  { id: "endoskopie-raum2",  label: "Endoskopie · Raum 2",           kurzlabel: "Endoskopie · R. 2" },
]

// ── Context Shape ───────────────────────────────────────
interface ShellContextValue {
  // View mode
  viewMode: ViewMode
  setViewMode: (m: ViewMode) => void

  // Active module
  activeModule: string
  setActiveModule: (id: string) => void

  // Sidebar collapse
  collapsed: boolean
  toggleCollapsed: () => void

  // Patient context
  patient: PatientContext | null
  openPatient: (p: PatientContext, from?: ReturnTo) => void
  openPatientAdHoc: (p: PatientContext) => void  // ad-hoc jump, parks current chain
  clearPatient: () => void
  setPatientFall: (f: Fall) => void

  // Station list for patient stepper (= "chain")
  stationPatients: StationsPatient[]
  setStationPatients: (list: StationsPatient[]) => void
  navigatePatient: (dir: "prev" | "next") => void
  patientIndex: number

  // Parked chain (for ad-hoc interruptions)
  parkedChain: ParkedChain | null
  returnToChain: () => void

  // Pinned patients (bookmarks, sidebar bottom)
  pinnedPatients: PinnedPatient[]
  pinPatient: (p: PatientContext) => void
  unpinPatient: (patientId: string) => void
  openPinnedPatient: (patientId: string) => void
  isPatientPinned: (patientId: string) => boolean
  reorderPinnedPatients: (fromIndex: number, toIndex: number) => void
  pinPatientFromStation: (sp: StationsPatient) => void

  // Return-to (list origin)
  returnTo: ReturnTo | null

  // User context
  user: UserContext
  updateUser: (partial: Partial<UserContext>) => void

  // Patient search dialog
  patientSearchOpen: boolean
  setPatientSearchOpen: (v: boolean) => void

  // Global search
  globalSearchOpen: boolean
  setGlobalSearchOpen: (v: boolean) => void

  // FAP (Funktionsarbeitsplatz)
  activeFap: FapId
  setActiveFap: (id: FapId) => void

  // FAP type + unit (new granular selectors)
  activeFapType: FapType
  setActiveFapType: (t: FapType) => void
  activeFapUnit: string   // unit id within the type, "" when none/not applicable
  setActiveFapUnit: (u: string) => void

  // Active encounter index within the encounter strip
  activeEncounterIndex: number
  setActiveEncounterIndex: (i: number) => void
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
  const [activeFapType, setActiveFapTypeRaw] = useState<FapType>("none")
  const [activeFapUnit, setActiveFapUnitRaw] = useState<string>("")
  const [activeEncounterIndex, setActiveEncounterIndex] = useState(0)

  // Keep legacy activeFap in sync when type+unit changes
  const setActiveFapType = useCallback((t: FapType) => {
    const typeDef = FAP_TYPEN.find(td => td.id === t)
    const defaultUnit = typeDef?.units[0]?.id ?? ""
    setActiveFapTypeRaw(t)
    setActiveFapUnitRaw(defaultUnit)
    setActiveFapRaw(deriveFapId(t, defaultUnit))
  }, [])

  const setActiveFapUnit = useCallback((u: string) => {
    setActiveFapUnitRaw(u)
    setActiveFapRaw(deriveFapId(activeFapType, u))
  }, [activeFapType])

  // Legacy setter (used by topbar read-only badge, kept for compat)
  const setActiveFap = useCallback((id: FapId) => {
    setActiveFapRaw(id)
  }, [])

  // Apply dark mode class
  useEffect(() => {
    if (user.farbschema === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [user.farbschema])

  // Note: Ctrl+K for search is handled in Topbar directly

  // Set view mode
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

  // Open patient from station list (normal chain navigation)
  const openPatient = useCallback((p: PatientContext, from?: ReturnTo) => {
    setPatient(p)
    setReturnTo(from ?? null)
    setParkedChain(null) // clear any parked chain -- this IS the chain now
    setViewModeRaw("patient")
    setActiveModuleRaw(PATIENTEN_MODULE[0].id)
  }, [])

  // Open patient ad-hoc (e.g. phone call interruption)
  // Parks the current chain so the user can return instantly
  const openPatientAdHoc = useCallback((p: PatientContext) => {
    if (patient && stationPatients.length > 0) {
      // Park the current chain
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

  // Return to parked chain
  const returnToChain = useCallback(() => {
    if (!parkedChain) return
    setPatient(parkedChain.patient)
    setStationPatients(parkedChain.stationPatients)
    setActiveModuleRaw(parkedChain.moduleId)
    setViewModeRaw("patient")
    setReturnTo({ moduleId: "stationsliste", label: "Stationsliste" })
    setParkedChain(null)
  }, [parkedChain])

  // Clear patient -> switch back to lists
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

  // Switch fall
  const setPatientFall = useCallback((f: Fall) => {
    setPatient(prev => prev ? { ...prev, aktiverFall: f } : null)
  }, [])

  // Patient index in current station list
  const patientIndex = patient
    ? stationPatients.findIndex(sp => sp.patientId === patient.patientId)
    : -1

  // Navigate patient (step through chain)
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

  // Pinned patients (bookmarks)
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
    // This is an ad-hoc jump -- park chain if in one
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

  // Pin directly from station list data (no need to open patient first)
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

  // Update user preferences
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
      activeFapType, setActiveFapType,
      activeFapUnit, setActiveFapUnit,
      activeEncounterIndex, setActiveEncounterIndex,
    }}>
      {children}
    </ShellContext.Provider>
  )
}

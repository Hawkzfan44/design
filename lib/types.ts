// ── View Modes ──────────────────────────────────────────
export type ViewMode = "listen" | "patient"

// ── Module Definitions ──────────────────────────────────
export interface ModuleDefinition {
  id: string
  label: string
  icon: string // lucide icon name
  group?: string
}

// Arbeitslisten modules
export const ARBEITSLISTEN_MODULE: ModuleDefinition[] = [
  { id: "stationsliste", label: "Stationsliste", icon: "bed-double" },
  { id: "kommissionierung", label: "Kommissionierung", icon: "package-check" },
  { id: "abrechnung-liste", label: "Abrechnung", icon: "receipt" },
  { id: "stellliste", label: "Stellliste", icon: "clipboard-list" },
]

// Patient modules -- grouped
export const PATIENTEN_MODULE: ModuleDefinition[] = [
  // Falluebersicht (case-level modules)
  { id: "verordnungen", label: "Verordnungen", icon: "pill", group: "Falluebersicht" },
  { id: "kurve", label: "Kurve", icon: "activity", group: "Falluebersicht" },
  { id: "diagnosen", label: "Diagnosen", icon: "stethoscope", group: "Falluebersicht" },
  { id: "dokumentation", label: "Dokumentation", icon: "file-text", group: "Falluebersicht" },
  // Administration (patient-level, not case-specific)
  { id: "abrechnung-patient", label: "Abrechnung", icon: "receipt", group: "Administration" },
]

// ── Fall (Case) ─────────────────────────────────────────
export interface Fall {
  fallNummer: string
  fallArt: "stationaer" | "ambulant" | "teilstationaer"
  fachabteilung: string
  station: string
  aufnahme: string   // ISO date
  entlassung?: string // ISO date, undefined = active
}

// ── Patient Context ─────────────────────────────────────
export interface PatientContext {
  patientId: string
  name: string       // "Nachname, Vorname"
  geburtsdatum: string
  geschlecht: "M" | "W" | "D"
  station: string
  faelle: Fall[]
  aktiverFall: Fall
}

// ── Pinned Patient (hot-list for ad-hoc doctor workflow) ─
export interface PinnedPatient {
  patient: PatientContext
  moduleId: string    // last active module when pinned/parked
  pinnedAt: number    // timestamp
}

// ── Return-To (origin tracking for back navigation) ─────
export interface ReturnTo {
  moduleId: string
  label: string
}

// ── Klinik ──────────────────────────────────────────────
export interface Klinik {
  id: string
  name: string
  kurzname: string
}

export const KLINIKEN: Klinik[] = [
  { id: "barmbek", name: "Asklepios Klinik Barmbek", kurzname: "Barmbek" },
  { id: "altona", name: "Asklepios Klinik Altona", kurzname: "Altona" },
  { id: "wandsbek", name: "Asklepios Klinik Wandsbek", kurzname: "Wandsbek" },
  { id: "harburg", name: "Asklepios Klinik Harburg", kurzname: "Harburg" },
  { id: "nord", name: "Asklepios Klinik Nord", kurzname: "Nord" },
  { id: "st-georg", name: "Asklepios Klinik St. Georg", kurzname: "St. Georg" },
  { id: "rissen", name: "Asklepios Klinik Rissen", kurzname: "Rissen" },
]

// ── Profil/Ansicht ──────────────────────────────────────
export interface Profil {
  id: string
  label: string
}

export const PROFILE: Profil[] = [
  { id: "arzt", label: "Arzt" },
  { id: "pflege", label: "Pflege" },
  { id: "admin", label: "Administration" },
]

// ── Sprache ─────────────────────────────────────────────
export interface Sprache {
  id: string
  label: string
}

export const SPRACHEN: Sprache[] = [
  { id: "de", label: "Deutsch" },
  { id: "en", label: "English" },
  { id: "fr", label: "Francais" },
  { id: "tr", label: "Tuerkce" },
]

// ── User Context ────────────────────────────────────────
export interface UserContext {
  benutzername: string
  vollname: string
  mandant: string
  klinikId: string
  profilId: string
  freigegebeneProfile: string[]
  arbeitsplatz: string
  spracheId: string
  zeitzone: string
  farbschema: "light" | "dark"
}

// ── System Config ───────────────────────────────────────
export interface SystemConfig {
  isTestSystem: boolean
  testBannerText: string
}

export const SYSTEM_CONFIG: SystemConfig = {
  isTestSystem: true,
  testBannerText: "TESTSYSTEM -- Nicht für den Einsatz am Patienten!",
}

// ── Demo Patients (station-based) ───────────────────────
export interface StationsPatient {
  patientId: string
  name: string
  geburtsdatum: string
  geschlecht: "M" | "W" | "D"
  station: string
  zimmer: string
  faelle: Fall[]
}

export const DEMO_PATIENTEN: StationsPatient[] = [
  {
    patientId: "P-10001",
    name: "Mustermann, Max",
    geburtsdatum: "1965-03-15",
    geschlecht: "M",
    station: "3A",
    zimmer: "301",
    faelle: [
      { fallNummer: "F-2026-1001", fallArt: "stationaer", fachabteilung: "Innere Medizin", station: "3A", aufnahme: "2026-02-10" },
      { fallNummer: "F-2025-8834", fallArt: "ambulant", fachabteilung: "Kardiologie", station: "3A", aufnahme: "2025-11-02", entlassung: "2025-11-02" },
    ],
  },
  {
    patientId: "P-10002",
    name: "Fischer, Maria-Elisabeth",
    geburtsdatum: "1978-07-22",
    geschlecht: "W",
    station: "3A",
    zimmer: "302",
    faelle: [
      { fallNummer: "F-2026-1042", fallArt: "stationaer", fachabteilung: "Chirurgie", station: "3A", aufnahme: "2026-02-12" },
    ],
  },
  {
    patientId: "P-10003",
    name: "Schmidt, Thomas",
    geburtsdatum: "1952-11-30",
    geschlecht: "M",
    station: "3A",
    zimmer: "303a",
    faelle: [
      { fallNummer: "F-2026-1055", fallArt: "stationaer", fachabteilung: "Innere Medizin", station: "3A", aufnahme: "2026-02-13" },
      { fallNummer: "F-2026-0800", fallArt: "stationaer", fachabteilung: "Neurologie", station: "3A", aufnahme: "2026-01-20", entlassung: "2026-02-01" },
    ],
  },
  {
    patientId: "P-10004",
    name: "Hoffmann-Guenther, Elke",
    geburtsdatum: "1990-01-08",
    geschlecht: "W",
    station: "3A",
    zimmer: "304",
    faelle: [
      { fallNummer: "F-2026-1070", fallArt: "stationaer", fachabteilung: "Gynaekologie", station: "3A", aufnahme: "2026-02-14" },
    ],
  },
  {
    patientId: "P-10005",
    name: "Weber, Karl-Heinz",
    geburtsdatum: "1948-05-19",
    geschlecht: "M",
    station: "3A",
    zimmer: "305",
    faelle: [
      { fallNummer: "F-2026-1088", fallArt: "stationaer", fachabteilung: "Innere Medizin", station: "3A", aufnahme: "2026-02-14" },
    ],
  },
  {
    patientId: "P-10006",
    name: "Braun, Sabine",
    geburtsdatum: "1985-09-12",
    geschlecht: "W",
    station: "3A",
    zimmer: "306",
    faelle: [
      { fallNummer: "F-2026-1090", fallArt: "stationaer", fachabteilung: "Chirurgie", station: "3A", aufnahme: "2026-02-15" },
    ],
  },
  {
    patientId: "P-10007",
    name: "Mueller, Andreas",
    geburtsdatum: "1970-12-03",
    geschlecht: "M",
    station: "3A",
    zimmer: "307",
    faelle: [
      { fallNummer: "F-2026-1095", fallArt: "stationaer", fachabteilung: "Orthopaedie", station: "3A", aufnahme: "2026-02-15" },
    ],
  },
  {
    patientId: "P-10008",
    name: "Klein, Petra",
    geburtsdatum: "1960-04-25",
    geschlecht: "W",
    station: "3A",
    zimmer: "308",
    faelle: [
      { fallNummer: "F-2026-1100", fallArt: "stationaer", fachabteilung: "Innere Medizin", station: "3A", aufnahme: "2026-02-15" },
    ],
  },
  // Station 2B
  {
    patientId: "P-20001",
    name: "Schneider, Julia",
    geburtsdatum: "1995-06-18",
    geschlecht: "W",
    station: "2B",
    zimmer: "201",
    faelle: [
      { fallNummer: "F-2026-2001", fallArt: "stationaer", fachabteilung: "Paediatrie", station: "2B", aufnahme: "2026-02-11" },
    ],
  },
  {
    patientId: "P-20002",
    name: "Wagner, Friedrich",
    geburtsdatum: "1942-08-07",
    geschlecht: "M",
    station: "2B",
    zimmer: "202",
    faelle: [
      { fallNummer: "F-2026-2010", fallArt: "stationaer", fachabteilung: "Geriatrie", station: "2B", aufnahme: "2026-02-09" },
    ],
  },
]

// ── Available Stations (derived from demo data) ─────────
export const STATIONEN: string[] = Array.from(
  new Set(DEMO_PATIENTEN.map(p => p.station))
).sort()

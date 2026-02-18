"use client"

import { useShell } from "@/lib/shell-context"
import { PatientSearch } from "./patient-search"

export function PatientSearchWrapper() {
  const { patientSearchOpen, setPatientSearchOpen, openPatientAdHoc } = useShell()

  return (
    <PatientSearch
      open={patientSearchOpen}
      onOpenChange={setPatientSearchOpen}
      onSelect={(patient) => openPatientAdHoc(patient)}
    />
  )
}

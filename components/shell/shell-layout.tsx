"use client"

import { ShellProvider } from "@/lib/shell-context"
import { SidebarNav } from "./sidebar-nav"
import { Topbar } from "./topbar"
import { MobileNav } from "./mobile-nav"
import { ModuleContent } from "./module-content"
import { PatientSearchWrapper } from "./patient-search-wrapper"
import { ContextPanel } from "./context-panel"

export function ShellLayout() {
  return (
    <ShellProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        {/* Desktop/Tablet sidebar */}
        <SidebarNav />

        {/* Main area */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Topbar */}
          <div className="flex items-center">
            <div className="md:hidden">
              <MobileNav />
            </div>
            <div className="flex-1">
              <Topbar />
            </div>
          </div>

          {/* Content + Context Panel */}
          <div className="flex flex-1 min-h-0">
            <main className="flex-1 overflow-hidden">
              <ModuleContent />
            </main>
            <ContextPanel />
          </div>
        </div>
      </div>

      {/* Patient search dialog (global) */}
      <PatientSearchWrapper />
    </ShellProvider>
  )
}

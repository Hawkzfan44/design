"use client"

import { ShellProvider } from "@/lib/shell-context"
import { SidebarNav } from "./sidebar-nav"
import { Topbar } from "./topbar"
import { MobileNav } from "./mobile-nav"
import { ModuleContent } from "./module-content"
import { PatientSearchWrapper } from "./patient-search-wrapper"
import { BottomTabBar } from "./bottom-tab-bar"

export function ShellLayout() {
  return (
    <ShellProvider>
      <div className="flex h-[100dvh] w-screen overflow-hidden bg-background">
        {/* Desktop/Tablet sidebar — hidden on mobile */}
        <SidebarNav />

        {/* Main area: full height column */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Topbar */}
          <Topbar />

          {/* Content — shrinks to leave room for BottomTabBar on mobile */}
          <main className="flex-1 overflow-hidden">
            <ModuleContent />
          </main>

          {/* Bottom tab bar — only visible on mobile, hidden on md+ */}
          <BottomTabBar />
        </div>
      </div>

      {/* Mobile nav sheet — triggered by bottom tab "Mehr" */}
      <MobileNav />

      {/* Patient search dialog (global) */}
      <PatientSearchWrapper />
    </ShellProvider>
  )
}

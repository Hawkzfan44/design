"use client"

import { ListTodo, BedDouble, Search, Menu } from "lucide-react"
import { useShell } from "@/lib/shell-context"

interface Tab {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const TABS: Tab[] = [
  { id: "listen",  label: "Listen",  icon: ListTodo  },
  { id: "patient", label: "Patient", icon: BedDouble  },
  { id: "suche",   label: "Suche",   icon: Search    },
  { id: "menue",   label: "Mehr",    icon: Menu      },
]

export function BottomTabBar() {
  const {
    viewMode, setViewMode,
    setPatientSearchOpen,
    setMobileMenuOpen,
  } = useShell()

  const handleTab = (tabId: string) => {
    if (tabId === "suche") {
      setPatientSearchOpen(true)
      return
    }
    if (tabId === "menue") {
      setMobileMenuOpen(true)
      return
    }
    if (tabId === "listen" || tabId === "patient") {
      setViewMode(tabId as "listen" | "patient")
    }
  }

  const isActive = (tabId: string) => {
    if (tabId === "listen")  return viewMode === "listen"
    if (tabId === "patient") return viewMode === "patient"
    return false
  }

  return (
    <nav
      className="
        md:hidden
        flex items-center
        bg-navbar border-t border-navbar-border
        shrink-0
        safe-area-pb
      "
      aria-label="Hauptnavigation"
    >
      {TABS.map(tab => {
        const Icon = tab.icon
        const active = isActive(tab.id)
        return (
          <button
            key={tab.id}
            onClick={() => handleTab(tab.id)}
            className={`
              flex flex-col items-center justify-center gap-1
              flex-1 py-2.5
              text-[10px] font-medium transition-colors
              ${active
                ? "text-navbar-active"
                : "text-navbar-section hover:text-navbar-foreground"
              }
            `}
            aria-label={tab.label}
            aria-current={active ? "page" : undefined}
          >
            <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
            <span>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

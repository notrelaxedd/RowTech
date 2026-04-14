"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Clock,
  BarChart3,
  Users,
  Cpu,
  Anchor,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// Sidebar — Navigation links, RowTech wordmark, active route highlight.
// =============================================================================

const NAV_ITEMS = [
  { href: "/",          label: "Live",      icon: LayoutDashboard },
  { href: "/sessions",  label: "Sessions",  icon: Clock           },
  { href: "/analytics", label: "Analytics", icon: BarChart3       },
  { href: "/coach",     label: "Coach",     icon: UserCog         },
  { href: "/devices",   label: "Devices",   icon: Cpu             },
  { href: "/boats",     label: "Boats",     icon: Anchor          },
  { href: "/rowers",    label: "Rowers",    icon: Users           },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border bg-card">
      {/* Wordmark */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <rect width="32" height="32" rx="8" fill="#0ea5e9" />
          <path
            d="M6 22 Q12 10 16 16 Q20 22 26 10"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        <span className="text-base font-bold tracking-tight text-foreground">RowTech</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Clapperboard, Users, ScrollText, LogOut, Gamepad2, Settings } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { LogoSVG } from "./LogoSVG";

function ValorantIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <polygon points="0,1 3.5,1 12,21 8.5,21" />
      <polygon points="12,21 15.5,21 19,12 15.5,12" />
      <polygon points="16.5,10 20,10 23,1 19.5,1" />
    </svg>
  );
}

const navGroups = [
  {
    label: "Général",
    items: [
      { href: "/",        label: "Dashboard",  icon: LayoutDashboard },
      { href: "/membres", label: "Membres",    icon: Users },
      { href: "/cinema",  label: "Cinéma",     icon: Clapperboard },
      { href: "/logs",    label: "Logs",       icon: ScrollText },
    ],
  },
  {
    label: "Fonctionnalités",
    items: [
      { href: "/valorant",    label: "Valorant",    icon: ValorantIcon },
      { href: "/steam",       label: "Steam",       icon: Gamepad2 },
      { href: "/parametres",  label: "Paramètres",  icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 flex-col bg-sidebar border-r border-sidebar-border shrink-0">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-sidebar-border">
        <LogoSVG className="h-7 w-auto text-sidebar-foreground" />
        <span className="font-semibold text-sm tracking-wide text-sidebar-foreground">Chao</span>
      </div>

      {/* Nav groupée */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {navGroups.map(({ label, items }) => (
          <div key={label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted select-none">
              {label}
            </p>
            <div className="space-y-0.5">
              {items.map(({ href, label: itemLabel, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                      "transition-all duration-150 ease-out",
                      active
                        ? "bg-primary/15 text-primary"
                        : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-primary" />
                    )}
                    <Icon className="h-4 w-4 shrink-0" />
                    {itemLabel}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-sidebar-border p-3 space-y-0.5">
        <ThemeToggle />
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-muted transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}

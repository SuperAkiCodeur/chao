"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Clapperboard, Users, ScrollText, LogOut } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { LogoSVG } from "./LogoSVG";

// Logo officiel Valorant (V avec la coupure caractéristique sur le côté droit)
function ValorantIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Trait gauche */}
      <polygon points="0,1 3.5,1 12,21 8.5,21" />
      {/* Trait droit bas */}
      <polygon points="12,21 15.5,21 19,12 15.5,12" />
      {/* Trait droit haut (séparé par la coupure) */}
      <polygon points="16.5,10 20,10 23,1 19.5,1" />
    </svg>
  );
}

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/membres", label: "Membres", icon: Users },
  { href: "/watch", label: "Cinéma", icon: Clapperboard },
  { href: "/valorant", label: "Valorant", icon: ValorantIcon },
  { href: "/logs", label: "Logs", icon: ScrollText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 flex-col bg-sidebar border-r border-sidebar-border shrink-0">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 px-5 border-b border-sidebar-border">
        <LogoSVG className="h-7 w-auto text-sidebar-foreground" />
        <span className="font-semibold text-sm tracking-wide text-sidebar-foreground">Chao</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                "transition-all duration-200 ease-out",
                active
                  ? "bg-primary/15 text-primary translate-x-0.5"
                  : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground hover:translate-x-0.5",
              )}
            >
              {/* Barre verticale active */}
              <span
                className={cn(
                  "absolute left-0 top-1/2 -translate-y-1/2 w-0.5 rounded-full bg-primary",
                  "transition-all duration-200 ease-out",
                  active ? "h-4 opacity-100" : "h-0 opacity-0",
                )}
              />
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Theme + Logout */}
      <div className="p-3 border-t border-sidebar-border">
        <ThemeToggle />
      </div>
      <div className="p-3 border-t border-sidebar-border">
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

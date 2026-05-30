"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Clapperboard, Users, ScrollText,
  Gamepad2, Settings, LogOut,
} from "lucide-react";
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

const navItems = [
  { href: "/",           label: "Dashboard",  icon: LayoutDashboard },
  { href: "/membres",    label: "Membres",    icon: Users           },
  { href: "/cinema",     label: "Cinéma",     icon: Clapperboard    },
  { href: "/logs",       label: "Logs",       icon: ScrollText      },
  { href: "/valorant",   label: "Valorant",   icon: ValorantIcon    },
  { href: "/steam",      label: "Steam",      icon: Gamepad2        },
  { href: "/parametres", label: "Paramètres", icon: Settings        },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col" style={{ background: "#111111" }}>

      {/* Logo */}
      <div className="px-6 pt-8 pb-8">
        <div className="flex items-center gap-2.5">
          <LogoSVG className="h-6 w-auto text-white" />
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-white">Chao</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4">
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {navItems.map(({ href, label, icon: Icon }, i) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center justify-between py-3.5 px-2 text-xs font-semibold uppercase tracking-[0.12em] transition-colors duration-150",
                  active ? "text-white" : "text-white/30 hover:text-white/65",
                )}
                style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="flex items-center gap-3">
                  <span style={{ color: active ? "#C8FF47" : "rgba(255,255,255,0.18)", fontSize: "10px", fontWeight: 700 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {label}
                </div>
                {active && <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "#C8FF47" }} />}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Logout */}
      <div className="px-6 pb-6 pt-4">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/25 hover:text-white/50 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Déconnexion
        </button>
      </div>

    </div>
  );
}

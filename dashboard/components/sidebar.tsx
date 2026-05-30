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

const groups = [
  {
    label: "Général",
    items: [
      { href: "/",           label: "Dashboard",  icon: LayoutDashboard },
      { href: "/membres",    label: "Membres",    icon: Users           },
      { href: "/cinema",     label: "Cinéma",     icon: Clapperboard    },
      { href: "/logs",       label: "Logs",       icon: ScrollText      },
    ],
  },
  {
    label: "Fonctionnalités",
    items: [
      { href: "/valorant",   label: "Valorant",   icon: ValorantIcon    },
      { href: "/steam",      label: "Steam",      icon: Gamepad2        },
      { href: "/parametres", label: "Paramètres", icon: Settings        },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col" style={{ background: "#111111" }}>

      {/* Logo */}
      <div className="flex h-[64px] items-center gap-3 px-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <LogoSVG className="h-7 w-auto text-white" />
        <span className="font-bold text-white text-sm tracking-wide">Chao</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-6">
        {groups.map(({ label, items }) => (
          <div key={label}>
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.22)" }}>
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
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                      active
                        ? "text-white bg-white/10"
                        : "text-white/40 hover:text-white/75 hover:bg-white/5",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {itemLabel}
                    {/* Seul usage du lime : petit point actif */}
                    {active && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "#C8FF47" }} />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-4 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/30 hover:text-white/60 hover:bg-white/5 transition-all duration-150"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

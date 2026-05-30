"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Search, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoSVG } from "./LogoSVG";

const navItems = [
  { href: "/",           label: "Accueil"   },
  { href: "/membres",    label: "Membres"   },
  { href: "/cinema",     label: "Cinéma"    },
  { href: "/logs",       label: "Logs"      },
  { href: "/valorant",   label: "Valorant"  },
  { href: "/steam",      label: "Steam"     },
  { href: "/parametres", label: "Réglages"  },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <div className="absolute top-4 inset-x-4 z-50 flex items-center gap-3">

      {/* ── Left: Logo + Settings ── */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.96)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.10)",
          }}
        >
          <LogoSVG className="h-5 w-5 text-slate-700" />
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-700 px-3.5 py-2 rounded-full transition-all hover:bg-white/80"
          style={{
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.95)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
          }}
        >
          <Settings className="h-3.5 w-3.5" />
          Réglages
        </button>
      </div>

      {/* ── Center: Nav pill bar ── */}
      <div className="flex-1 flex justify-center min-w-0">
        <div
          className="flex items-center gap-0.5 p-1 rounded-full overflow-x-auto scrollbar-none"
          style={{
            background: "rgba(255,255,255,0.75)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.92)",
            boxShadow: "0 2px 14px rgba(0,0,0,0.10)",
          }}
        >
          {navItems.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150 whitespace-nowrap",
                  active
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-800 hover:bg-white/50",
                )}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Right: Search ── */}
      <div className="shrink-0">
        <button
          className="h-9 w-9 rounded-full flex items-center justify-center text-slate-600 transition-all hover:bg-white/80"
          style={{
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.95)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
          }}
        >
          <Search className="h-4 w-4" />
        </button>
      </div>

    </div>
  );
}

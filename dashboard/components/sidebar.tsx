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
      { href: "/valorant",   label: "Valorant",   icon: ValorantIcon },
      { href: "/steam",      label: "Steam",      icon: Gamepad2 },
      { href: "/parametres", label: "Paramètres", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex h-screen w-60 flex-col shrink-0"
      style={{
        background: "rgba(4, 12, 55, 0.62)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        borderRight: "1px solid rgba(120, 180, 255, 0.22)",
        boxShadow: "4px 0 32px rgba(0, 10, 60, 0.40)",
      }}
    >
      {/* ── Logo ── */}
      <div
        className="relative flex h-16 items-center gap-3 px-5 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(0, 80, 220, 0.35) 0%, rgba(0, 180, 255, 0.18) 50%, rgba(0, 80, 200, 0.28) 100%)",
          borderBottom: "1px solid rgba(100, 180, 255, 0.2)",
        }}
      >
        {/* Chrome shimmer line at bottom */}
        <div
          className="absolute inset-x-0 bottom-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent 0%, rgba(0,229,255,0.5) 50%, transparent 100%)" }}
        />
        <LogoSVG className="h-7 w-auto text-cyan-300 drop-shadow-[0_0_7px_rgba(0,229,255,0.85)]" />
        <span
          className="font-bold text-base tracking-[0.18em] uppercase"
          style={{
            background: "linear-gradient(135deg, #fff 0%, #a8d4ff 30%, #fff 52%, #cce8ff 76%, #fff 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Chao
        </span>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-6">
        {navGroups.map(({ label, items }) => (
          <div key={label}>
            {/* Section label */}
            <div className="flex items-center gap-2 px-2 mb-2.5">
              <span className="text-[8px]" style={{ color: "rgba(0,229,255,0.45)" }}>◆</span>
              <p
                className="text-[9px] font-bold uppercase tracking-[0.22em]"
                style={{ color: "rgba(180, 220, 255, 0.70)" }}
              >
                {label}
              </p>
              <div
                className="flex-1 h-px"
                style={{ background: "linear-gradient(90deg, rgba(0,229,255,0.25) 0%, transparent 100%)" }}
              />
            </div>

            {/* Nav items */}
            <div className="space-y-0.5">
              {items.map(({ href, label: itemLabel, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                      "transition-all duration-200 ease-out",
                      active
                        ? "text-cyan-300"
                        : "text-sky-100/75 hover:bg-white/[0.07] hover:text-white",
                    )}
                    style={active ? {
                      background: "rgba(0, 229, 255, 0.10)",
                      boxShadow: "inset 0 0 18px rgba(0,229,255,0.05)",
                    } : undefined}
                  >
                    {active && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-6 rounded-full bg-cyan-400"
                        style={{ boxShadow: "0 0 8px #00E5FF, 0 0 18px rgba(0,229,255,0.55)" }}
                      />
                    )}
                    <Icon
                      className={cn("h-4 w-4 shrink-0", active && "drop-shadow-[0_0_4px_rgba(0,229,255,0.75)]")}
                    />
                    {itemLabel}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Bottom actions ── */}
      <div
        className="p-3 space-y-0.5"
        style={{ borderTop: "1px solid rgba(100, 180, 255, 0.15)" }}
      >
        <ThemeToggle />
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 text-sky-200/55 hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}

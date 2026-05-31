"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Users, Clapperboard,
  ScrollText, Crosshair, Gamepad2, Settings,
} from "lucide-react";

const NAV = [
  { href: "/",           label: "Dashboard",  Icon: LayoutDashboard },
  { href: "/membres",    label: "Membres",    Icon: Users           },
  { href: "/cinema",     label: "Cinéma",     Icon: Clapperboard    },
  { href: "/logs",       label: "Logs",       Icon: ScrollText      },
  { href: "/valorant",   label: "Valorant",   Icon: Crosshair       },
  { href: "/steam",      label: "Steam",      Icon: Gamepad2        },
  { href: "/parametres", label: "Paramètres", Icon: Settings        },
];

export function Sidebar() {
  const path = usePathname();

  return (
    <aside style={{ width: "100%", height: "100%", background: "#1C1C1C", display: "flex", flexDirection: "column" }}>

      {/* Logo */}
      <div style={{ padding: "32px 28px 24px" }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: "#C8FF47", letterSpacing: "-0.05em", fontFamily: "inherit" }}>
          chao
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "0 14px", display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV.map(({ href, label, Icon }) => {
          const active = path === href;
          return (
            <Link key={href} href={href} style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "11px 14px", borderRadius: 12,
              textDecoration: "none", fontSize: 14, fontWeight: 500,
              color: active ? "#fff" : "rgba(255,255,255,0.38)",
              background: active ? "#2A2A2A" : "transparent",
              transition: "background 0.15s, color 0.15s",
            }}>
              <Icon size={18} strokeWidth={active ? 2.2 : 1.7} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom promo card — style "Level Up with Plus" */}
      <div style={{ margin: "16px 14px 20px", borderRadius: 16, background: "#C8FF47", padding: "20px 18px", position: "relative", overflow: "hidden" }}>
        {/* Decorative circle */}
        <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(0,0,0,0.08)" }} />
        <p style={{ fontSize: 15, fontWeight: 800, color: "#000", lineHeight: 1.3, marginBottom: 6, position: "relative" }}>
          Bot actif ✓
        </p>
        <p style={{ fontSize: 11, color: "rgba(0,0,0,0.50)", lineHeight: 1.5, marginBottom: 16, position: "relative" }}>
          Tous les services fonctionnent normalement.
        </p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            width: "100%", background: "#000", color: "#fff",
            border: "none", borderRadius: 8, padding: "9px 14px",
            fontSize: 12, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            position: "relative",
          }}
        >
          Déconnexion <span>→</span>
        </button>
      </div>

    </aside>
  );
}

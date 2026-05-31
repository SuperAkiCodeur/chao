"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Users, Clapperboard, ScrollText,
  Gamepad2, Settings, Crosshair,
} from "lucide-react";
import { LogoSVG } from "./LogoSVG";

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
    <aside style={{
      width: "100%", height: "100%",
      background: "#1A1A1A",
      display: "flex", flexDirection: "column",
      padding: "0",
    }}>

      {/* ── Logo ── */}
      <div style={{ padding: "32px 24px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "#C8FF47",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <LogoSVG className="h-5 w-auto text-black" />
          </div>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.04em" }}>chao</span>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav style={{ flex: 1, padding: "0 12px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map(({ href, label, Icon }) => {
          const active = path === href;
          return (
            <Link key={href} href={href} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 14px", borderRadius: 12,
              fontSize: 14, fontWeight: 500, textDecoration: "none",
              color: active ? "#fff" : "rgba(255,255,255,0.40)",
              background: active ? "rgba(255,255,255,0.08)" : "transparent",
              transition: "all 0.15s",
            }}>
              <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* ── Upgrade card (style Toko "Level Up") ── */}
      <div style={{ margin: "12px", borderRadius: 14, background: "#C8FF47", padding: "18px 16px" }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: "#000", marginBottom: 4 }}>Bot actif ✓</p>
        <p style={{ fontSize: 11, color: "rgba(0,0,0,0.50)", lineHeight: 1.45, marginBottom: 14 }}>
          Tous les services fonctionnent normalement.
        </p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            width: "100%", background: "#000", color: "#fff",
            border: "none", borderRadius: 8, padding: "8px 14px",
            fontSize: 12, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          Déconnexion <span style={{ fontSize: 16 }}>→</span>
        </button>
      </div>

    </aside>
  );
}

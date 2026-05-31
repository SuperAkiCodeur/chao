"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Users, Clapperboard,
  ScrollText, Crosshair, Gamepad2, Settings, LogOut,
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
    <aside style={{
      width: "100%", height: "100%",
      background: "#1C1C1C",
      display: "flex", flexDirection: "column",
    }}>

      {/* Logo — hauteur fixe 60px, aligne avec le top-bar */}
      <div style={{
        height: 60, flexShrink: 0,
        display: "flex", alignItems: "center",
        padding: "0 20px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <span style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-0.05em" }}>
          chao
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "8px 10px 0" }}>
        {NAV.map(({ href, label, Icon }) => {
          const active = path === href;
          return (
            <Link key={href} href={href} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 12px", borderRadius: 10, marginBottom: 2,
              textDecoration: "none", fontSize: 14, fontWeight: 500,
              color: active ? "#fff" : "rgba(255,255,255,0.38)",
              background: active ? "#2A2A2A" : "transparent",
              transition: "background 0.15s, color 0.15s",
            }}>
              <Icon size={17} strokeWidth={active ? 2.2 : 1.7} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{
        padding: "10px 10px 12px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            width: "100%",
            background: "transparent", color: "rgba(255,255,255,0.35)",
            border: "none", borderRadius: 10, padding: "10px 12px",
            fontSize: 13, fontWeight: 500, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 10,
            transition: "color 0.15s",
          }}
        >
          <LogOut size={15} />
          Déconnexion
        </button>
      </div>

    </aside>
  );
}

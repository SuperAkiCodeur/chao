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
    <aside style={{ width: "100%", height: "100%", background: "#1C1C1C", display: "flex", flexDirection: "column" }}>

      {/* Logo */}
      <div style={{ padding: "32px 28px 24px" }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.05em" }}>
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

      {/* Logout */}
      <div style={{ padding: "16px 14px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            width: "100%", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.50)",
            border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <span>Déconnexion</span>
          <LogOut size={14} />
        </button>
      </div>

    </aside>
  );
}

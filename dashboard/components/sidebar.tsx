"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Clapperboard, ScrollText,
  Gamepad2, Settings, LogOut, Zap,
} from "lucide-react";
import { LogoSVG } from "./LogoSVG";

function ValorantIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="0,1 3.5,1 12,21 8.5,21" />
      <polygon points="12,21 15.5,21 19,12 15.5,12" />
      <polygon points="16.5,10 20,10 23,1 19.5,1" />
    </svg>
  );
}

const nav = [
  { href: "/",           label: "Dashboard",  Icon: LayoutDashboard },
  { href: "/membres",    label: "Membres",    Icon: Users           },
  { href: "/cinema",     label: "Cinéma",     Icon: Clapperboard    },
  { href: "/logs",       label: "Logs",       Icon: ScrollText      },
  { href: "/valorant",   label: "Valorant",   Icon: ValorantIcon    },
  { href: "/steam",      label: "Steam",      Icon: Gamepad2        },
  { href: "/parametres", label: "Paramètres", Icon: Settings        },
];

const BG   = "#1C1C1C";
const LIME = "#C8FF47";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div style={{ background: BG, height: "100%", display: "flex", flexDirection: "column" }}>

      {/* Logo */}
      <div style={{ padding: "28px 20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ background: LIME, borderRadius: "10px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LogoSVG className="h-5 w-auto text-black" />
          </div>
          <span style={{ fontSize: "18px", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>chao</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "0 12px", display: "flex", flexDirection: "column", gap: "2px" }}>
        {nav.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "10px 12px", borderRadius: "10px",
                textDecoration: "none", fontSize: "14px", fontWeight: 500,
                transition: "all 0.15s",
                background: active ? "rgba(255,255,255,0.09)" : "transparent",
                color: active ? "#fff" : "rgba(255,255,255,0.42)",
              }}
            >
              {"size" in Icon
                ? <Icon size={17} />
                : <Icon size={17} className="" style={{ width: 17, height: 17 }} />
              }
              {label}
              {active && (
                <span style={{ marginLeft: "auto", width: "6px", height: "6px", borderRadius: "50%", background: LIME }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Promo card */}
      <div style={{ margin: "16px 12px", borderRadius: "14px", background: LIME, padding: "20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <Zap size={16} style={{ color: "#000" }} />
          <span style={{ fontSize: "12px", fontWeight: 800, color: "#000", letterSpacing: "-0.01em" }}>Bot actif</span>
        </div>
        <p style={{ fontSize: "11px", color: "rgba(0,0,0,0.55)", lineHeight: 1.4, marginBottom: "14px" }}>
          Tous les services fonctionnent normalement.
        </p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{ width: "100%", background: "#000", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 0", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: "12px", paddingRight: "12px" }}
        >
          Déconnexion <LogOut size={13} />
        </button>
      </div>

    </div>
  );
}

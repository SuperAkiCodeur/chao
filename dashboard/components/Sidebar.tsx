"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Users, Clapperboard,
  ScrollText, Crosshair, Gamepad2, Settings, LogOut, BookOpen,
} from "lucide-react";

const NAV = [
  { href: "/",            label: "Dashboard",  Icon: LayoutDashboard },
  { href: "/membres",     label: "Membres",    Icon: Users           },
  { href: "/cinema",      label: "Cinéma",     Icon: Clapperboard    },
  { href: "/logs",        label: "Logs",       Icon: ScrollText      },
  { href: "/valorant",    label: "Valorant",   Icon: Crosshair       },
  { href: "/steam",       label: "Steam",      Icon: Gamepad2        },
  { href: "/commandes",   label: "Commandes",  Icon: BookOpen        },
  { href: "/parametres",  label: "Paramètres", Icon: Settings        },
];

export function Sidebar() {
  const path = usePathname();

  return (
    <aside style={{
      width: "100%", height: "100%",
      background: "#1C1C1C",
      display: "flex", flexDirection: "column",
    }}>

      {/* Logo */}
      <div className="anim-fade-in d-0" style={{
        height: 60, flexShrink: 0,
        display: "flex", alignItems: "center",
        padding: "0 20px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <span style={{
          fontSize: 26, fontWeight: 400, color: "#fff",
          fontFamily: "var(--font-serif)",
          letterSpacing: "0.01em",
          transition: "letter-spacing 0.35s cubic-bezier(0.16,1,0.3,1)",
          display: "inline-block",
        }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.letterSpacing = "0.06em"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.letterSpacing = "0.01em"; }}
        >
          chao
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "8px 10px 0" }}>
        {NAV.map(({ href, label, Icon }, i) => {
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              className="anim-slide-left"
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 12px", borderRadius: 10, marginBottom: 2,
                textDecoration: "none", fontSize: 14, fontWeight: 500,
                color: active ? "#fff" : "rgba(255,255,255,0.38)",
                background: active ? "#2A2A2A" : "transparent",
                transition: "background 0.15s, color 0.15s, transform 0.18s cubic-bezier(0.16,1,0.3,1)",
                animationDelay: `${i * 45}ms`,
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.color = "rgba(255,255,255,0.70)";
                  e.currentTarget.style.transform = "translateX(3px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.color = "rgba(255,255,255,0.38)";
                  e.currentTarget.style.transform = "none";
                }
              }}
            >
              <Icon size={17} strokeWidth={active ? 2.2 : 1.7} style={{ transition: "stroke-width 0.15s, transform 0.2s" }} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="anim-fade-in d-400" style={{
        padding: "10px 10px 12px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            width: "100%",
            background: "transparent", color: "rgba(255,255,255,0.30)",
            border: "none", borderRadius: 10, padding: "10px 12px",
            fontSize: 13, fontWeight: 500, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 10,
            transition: "color 0.15s, background 0.15s, transform 0.18s cubic-bezier(0.16,1,0.3,1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#ef4444";
            e.currentTarget.style.background = "rgba(239,68,68,0.08)";
            e.currentTarget.style.transform = "translateX(3px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgba(255,255,255,0.30)";
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.transform = "none";
          }}
        >
          <LogOut size={15} />
          Déconnexion
        </button>
      </div>

    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/",           label: "Dashboard"  },
  { href: "/membres",    label: "Membres"    },
  { href: "/cinema",     label: "Cinéma"     },
  { href: "/logs",       label: "Logs"       },
  { href: "/valorant",   label: "Valorant"   },
  { href: "/steam",      label: "Steam"      },
  { href: "/parametres", label: "Paramètres" },
];

const DIV = "1px solid rgba(255,255,255,0.07)";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col" style={{ background: "#111111" }}>

      {/* Logo */}
      <div className="px-7 py-8" style={{ borderBottom: DIV }}>
        <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "#fff" }}>
          Chao
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-7 py-6" style={{ borderBottom: DIV }}>
        <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", marginBottom: "20px" }}>
          / Nav
        </p>
        <div>
          {navItems.map(({ href, label }, i) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  padding: "10px 0",
                  borderBottom: DIV,
                  textDecoration: "none",
                  color: active ? "#fff" : "rgba(255,255,255,0.32)",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  transition: "color 0.15s",
                }}
              >
                <span style={{ color: active ? "#C8FF47" : "rgba(255,255,255,0.15)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", minWidth: "16px" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                {label}
                {active && <span style={{ marginLeft: "auto", height: "5px", width: "5px", borderRadius: "50%", background: "#C8FF47", flexShrink: 0 }} />}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Logout */}
      <div className="px-7 py-6">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{ background: "none", border: "none", padding: 0, fontSize: "9px", fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", cursor: "pointer", transition: "color 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.18)")}
        >
          Déconnexion →
        </button>
      </div>

    </div>
  );
}

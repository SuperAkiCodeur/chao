"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import {
  SquaresFour, Users, Popcorn,
  Scroll, SignOut,
  BookOpen, Stack, CaretDown, type IconWeight,
} from "@phosphor-icons/react";

const FEATURES = [
  { href: "/cinema", label: "Cinéma", Icon: Popcorn },
];

const FEATURE_HREFS = new Set(FEATURES.map((f) => f.href));

const NAV_TOP = [
  { href: "/",        label: "Dashboard", Icon: SquaresFour },
  { href: "/membres", label: "Membres",   Icon: Users       },
];

const NAV_BOTTOM = [
  { href: "/commandes", label: "Commandes", Icon: BookOpen },
  { href: "/logs",      label: "Logs",      Icon: Scroll   },
];

const linkBase: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 12,
  padding: "10px 12px", borderRadius: 10, marginBottom: 2,
  textDecoration: "none", fontSize: 15, fontWeight: 500,
  transition: "background 0.15s, color 0.15s",
};

export function Sidebar() {
  const path = usePathname();
  const onFeature = FEATURE_HREFS.has(path);

  const [open, setOpen]           = useState(onFeature);
  const [animClass, setAnimClass] = useState("");
  const [mounted, setMounted]     = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Auto-open when navigating to a feature page
  useEffect(() => {
    if (onFeature && !open) {
      setOpen(true);
      setAnimClass("animate-accordion-down");
    }
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle() {
    if (open) {
      setAnimClass("animate-accordion-up");
      // setOpen(false) is called in onAnimEnd once animation completes
    } else {
      setOpen(true);
      setAnimClass("animate-accordion-down");
    }
  }

  function onAnimEnd() {
    if (animClass === "animate-accordion-down") {
      setAnimClass("");
    } else if (animClass === "animate-accordion-up") {
      setOpen(false);
      setAnimClass("");
    }
  }

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

        {/* Top items */}
        {NAV_TOP.map(({ href, label, Icon }, i) => {
          const active = path === href;
          return (
            <NavLink key={href} href={href} label={label} Icon={Icon}
              active={active} delay={i * 45} />
          );
        })}

        {/* Features group */}
        <div className="anim-fade-in" style={{ animationDelay: `${NAV_TOP.length * 45}ms`, marginBottom: 2 }}>

          {/* Group trigger */}
          <button
            type="button"
            onClick={toggle}
            style={{
              ...linkBase,
              width: "100%", border: "none", cursor: "pointer",
              color: onFeature ? "#fff" : "rgba(255,255,255,0.38)",
              background: onFeature && !open ? "#2A2A2A" : "transparent",
              justifyContent: "space-between",
              marginBottom: 0,
            }}
            onMouseEnter={(e) => {
              if (!onFeature) e.currentTarget.style.color = "rgba(255,255,255,0.70)";
            }}
            onMouseLeave={(e) => {
              if (!onFeature) e.currentTarget.style.color = "rgba(255,255,255,0.38)";
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Stack size={17} weight={onFeature ? "bold" : "regular"} />
              Fonctionnalités
            </span>
            <CaretDown
              size={13}
              style={{
                color: "rgba(255,255,255,0.30)",
                transform: open ? "rotate(180deg)" : undefined,
                transition: "transform 0.22s cubic-bezier(0.16,1,0.3,1)",
              }}
            />
          </button>

          {/* Sub-items */}
          {open && (
            <div
              className={animClass}
              onAnimationEnd={onAnimEnd}
              style={{ overflow: "hidden" }}
            >
              <div style={{ paddingLeft: 8, paddingTop: 2, paddingBottom: 2 }}>
                {FEATURES.map(({ href, label, Icon }) => {
                  const active = path === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 12px", borderRadius: 8, marginBottom: 1,
                        textDecoration: "none", fontSize: 14, fontWeight: 500,
                        color: active ? "#fff" : "rgba(255,255,255,0.38)",
                        background: active ? "#2A2A2A" : "transparent",
                        transition: "background 0.15s, color 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.70)";
                      }}
                      onMouseLeave={(e) => {
                        if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.38)";
                      }}
                    >
                      <Icon size={15} weight={active ? "bold" : "regular"} />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bottom items — no separator */}
        {NAV_BOTTOM.map(({ href, label, Icon }, i) => {
          const active = path === href;
          return (
            <NavLink key={href} href={href} label={label} Icon={Icon}
              active={active} delay={(NAV_TOP.length + 1 + i) * 45} />
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
            fontSize: 14, fontWeight: 500, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 10,
            transition: "color 0.15s, background 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#ef4444";
            e.currentTarget.style.background = "rgba(239,68,68,0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgba(255,255,255,0.30)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <SignOut size={15} />
          Déconnexion
        </button>
      </div>

    </aside>
  );
}

// ── Shared nav link ───────────────────────────────────────────────────────────

function NavLink({ href, label, Icon, active, delay }: {
  href: string; label: string;
  Icon: React.ComponentType<{ size?: number; weight?: IconWeight; style?: React.CSSProperties }>;
  active: boolean; delay: number;
}) {
  return (
    <Link
      href={href}
      className="anim-fade-in"
      style={{
        ...linkBase,
        color: active ? "#fff" : "rgba(255,255,255,0.38)",
        background: active ? "#2A2A2A" : "transparent",
        animationDelay: `${delay}ms`,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.70)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.38)";
      }}
    >
      <Icon size={17} weight={active ? "bold" : "regular"} />
      {label}
    </Link>
  );
}

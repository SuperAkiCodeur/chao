"use client";

import { useState, useRef, useEffect } from "react";
import { CaretDown, Check, Hash, SpeakerHigh, MagnifyingGlass } from "@phosphor-icons/react";
import type { DiscordChannel } from "@/lib/discord";

const BD  = "1px solid rgba(255,255,255,0.08)";
const BDI = "1px solid rgba(255,255,255,0.12)";

export function ChannelSelect({ value, onChange, channels, placeholder = "Choisir un salon…", size = "md" }: {
  value: string;
  onChange: (v: string) => void;
  channels: DiscordChannel[];
  placeholder?: string;
  size?: "sm" | "md";
}) {
  const [open, setOpen]           = useState(false);
  const [animClass, setAnimClass] = useState("");
  const [query, setQuery]         = useState("");
  const ref       = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected  = channels.find((c) => c.id === value);
  const iconSize  = size === "sm" ? 11 : 12;
  const height    = size === "sm" ? 32 : 34;
  const fontSize  = size === "sm" ? 13 : 14;
  const isVisible = open && animClass !== "animate-expand-up";

  const filtered = query.trim()
    ? channels.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : channels;

  function doOpen()  { setOpen(true);  setAnimClass("animate-expand-down"); setTimeout(() => searchRef.current?.focus(), 10); }
  function doClose() { if (!open) return; setAnimClass("animate-expand-up"); }
  function onAnimEnd() { if (animClass === "animate-expand-up") { setOpen(false); setQuery(""); } setAnimClass(""); }

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) doClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={ref} style={{ position: "relative", flex: 1 }}>
      <button
        type="button"
        onClick={() => open ? doClose() : doOpen()}
        style={{
          height, width: "100%", display: "flex", alignItems: "center", gap: 7,
          background: value ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)",
          border: value ? BDI : BD, borderRadius: 8,
          paddingLeft: 10, paddingRight: 8, fontSize, cursor: "pointer",
        }}
      >
        {selected ? (
          <span style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
            {selected.type === 2 || selected.type === 13
              ? <SpeakerHigh size={iconSize} style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }} />
              : <Hash        size={iconSize} style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }} />}
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#fff" }}>
              {selected.name}
            </span>
          </span>
        ) : (
          <span style={{ flex: 1, textAlign: "left", color: "rgba(255,255,255,0.28)" }}>{placeholder}</span>
        )}
        <CaretDown size={iconSize} style={{
          color: "rgba(255,255,255,0.30)", flexShrink: 0,
          transform: isVisible ? "rotate(180deg)" : undefined,
          transition: "transform 0.15s ease",
        }} />
      </button>

      {open && (
        <div className={animClass} onAnimationEnd={onAnimEnd} style={{
          position: "absolute", left: 0, top: "calc(100% + 4px)", zIndex: 100,
          width: "max-content", minWidth: "100%", borderRadius: 10, border: BDI,
          background: "#2a2a2a", boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
        }}>
          {/* Search */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", borderBottom: BD }}>
            <MagnifyingGlass size={11} style={{ color: "rgba(255,255,255,0.28)", flexShrink: 0 }} />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && doClose()}
              placeholder="Rechercher…"
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: fontSize - 1, color: "#fff" }}
            />
            {query && (
              <button type="button" onClick={() => setQuery("")}
                style={{ color: "rgba(255,255,255,0.28)", background: "none", border: "none", cursor: "pointer", fontSize: 11, lineHeight: 1 }}>✕</button>
            )}
          </div>

          {/* Options */}
          <div style={{ maxHeight: 200, overflowY: "auto", padding: "3px 0" }}>
            {!query && (
              <button type="button" onClick={() => { onChange(""); doClose(); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", background: "none", border: "none", cursor: "pointer", fontSize: fontSize - 1, color: "rgba(255,255,255,0.35)" }}>
                <span style={{ width: iconSize, height: iconSize, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>— Aucun —</span>
                {!value && <Check size={iconSize} style={{ color: "#fff" }} />}
              </button>
            )}
            {filtered.length === 0 ? (
              <p style={{ padding: "7px 10px", fontSize: fontSize - 1, color: "rgba(255,255,255,0.28)", fontStyle: "italic" }}>
                Aucun résultat pour « {query} »
              </p>
            ) : filtered.map((c) => (
              <button key={c.id} type="button" onClick={() => { onChange(c.id); doClose(); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", background: "none", border: "none", cursor: "pointer", fontSize: fontSize - 1 }}>
                {c.type === 2 || c.type === 13
                  ? <SpeakerHigh size={iconSize} style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }} />
                  : <Hash        size={iconSize} style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }} />}
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#fff" }}>{c.name}</span>
                {value === c.id && <Check size={iconSize} style={{ color: "#fff", flexShrink: 0 }} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

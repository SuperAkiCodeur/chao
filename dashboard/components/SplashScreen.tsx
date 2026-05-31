"use client";

import { useEffect, useState } from "react";
import { LogoSVG } from "./LogoSVG";

export function SplashScreen() {
  const [fading, setFading] = useState(false);
  const [gone,   setGone]   = useState(false);

  useEffect(() => {
    // 1.8s fill → 0.4s pause → 0.5s fade out
    const t1 = setTimeout(() => setFading(true),  2200);
    const t2 = setTimeout(() => setGone(true),    2700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (gone) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
      style={{ transition: "opacity 0.5s ease-in", opacity: fading ? 0 : 1 }}
    >
      <div className="relative" style={{ height: 160, width: 108 }}>
        {/* Outline atténuée — toujours visible */}
        <LogoSVG className="absolute inset-0 h-full w-full text-foreground opacity-[0.07]" />

        {/* Remplissage qui monte de bas en haut */}
        <div
          className="absolute inset-0"
          style={{ animation: "logo-fill 1.8s cubic-bezier(0.22, 1, 0.36, 1) forwards" }}
        >
          <LogoSVG className="h-full w-full text-primary" />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 text-sky-200/55 hover:bg-white/[0.05] hover:text-sky-100"
    >
      {dark
        ? <Sun  className="h-4 w-4 shrink-0" />
        : <Moon className="h-4 w-4 shrink-0" />}
      {dark ? "Mode clair" : "Mode nuit"}
    </button>
  );
}

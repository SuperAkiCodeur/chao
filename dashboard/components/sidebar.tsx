"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Clapperboard, Users, ScrollText,
  Gamepad2, Settings, LogOut,
} from "lucide-react";
import { LogoSVG } from "./LogoSVG";

function ValorantIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <polygon points="0,1 3.5,1 12,21 8.5,21" />
      <polygon points="12,21 15.5,21 19,12 15.5,12" />
      <polygon points="16.5,10 20,10 23,1 19.5,1" />
    </svg>
  );
}

const navItems = [
  { href: "/",           label: "Dashboard",  icon: LayoutDashboard },
  { href: "/membres",    label: "Membres",    icon: Users           },
  { href: "/cinema",     label: "Cinéma",     icon: Clapperboard    },
  { href: "/logs",       label: "Logs",       icon: ScrollText      },
  { href: "/valorant",   label: "Valorant",   icon: ValorantIcon    },
  { href: "/steam",      label: "Steam",      icon: Gamepad2        },
  { href: "/parametres", label: "Paramètres", icon: Settings        },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-gray-200 bg-white shrink-0">
      <div className="flex h-16 items-center gap-3 px-5 border-b border-gray-200">
        <LogoSVG className="h-7 w-auto text-gray-800" />
        <span className="font-semibold text-gray-800 text-sm">Chao</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-200">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}

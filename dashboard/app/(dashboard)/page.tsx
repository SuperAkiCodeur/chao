import { db } from "@/lib/db";
import { cinemaParties, valorantLinks } from "@/lib/schema";
import { eq, count } from "drizzle-orm";
import { CommandsReference } from "@/components/CommandsReference";
import {
  Clapperboard, Crosshair, Activity, Users,
  ScrollText, Gamepad2, Settings, TrendingUp,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getStats() {
  const [{ total: activeCinema }] = await db
    .select({ total: count() })
    .from(cinemaParties)
    .where(eq(cinemaParties.status, "active"));

  const [{ total: totalValorant }] = await db
    .select({ total: count() })
    .from(valorantLinks);

  const recentCinema = await db
    .select()
    .from(cinemaParties)
    .orderBy(cinemaParties.viewingAt)
    .limit(5);

  return { activeCinema, totalValorant, recentCinema };
}

/* ── Vrai glassmorphism : fond très transparent + blur fort ── */
const card = {
  background: "rgba(255, 255, 255, 0.18)",
  backdropFilter: "blur(36px) saturate(180%)",
  WebkitBackdropFilter: "blur(36px) saturate(180%)",
  border: "1px solid rgba(255, 255, 255, 0.32)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.45)",
  borderRadius: "20px",
} as const;

/* Texte visible sur verre clair */
const textPrimary   = { color: "#fff",               textShadow: "0 1px 4px rgba(0,0,0,0.30)" } as const;
const textSecondary = { color: "rgba(255,255,255,0.82)", textShadow: "0 1px 3px rgba(0,0,0,0.20)" } as const;
const textMuted     = { color: "rgba(255,255,255,0.60)" } as const;

/* Icône glass */
const iconWrap = {
  background: "rgba(255,255,255,0.22)",
  border: "1px solid rgba(255,255,255,0.30)",
  borderRadius: "12px",
} as const;

/* Badge nombre */
function Badge({ n }: { n: number | string }) {
  return (
    <div
      className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
      style={{ background: "rgba(0,0,0,0.32)", color: "#fff", backdropFilter: "blur(8px)" }}
    >
      {n}
    </div>
  );
}

/* ── StatCard ── */
function StatCard({
  title, subtitle, value, icon: Icon,
}: {
  title: string; subtitle: string; value: number | string; icon: React.ElementType;
}) {
  return (
    <div className="p-5 flex flex-col h-44" style={card}>
      <div className="flex items-center justify-between">
        <div className="h-9 w-9 flex items-center justify-center" style={iconWrap}>
          <Icon className="h-[18px] w-[18px] text-white" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={textMuted}>
          Live
        </span>
      </div>
      <div className="mt-auto">
        <p className="text-3xl font-bold tracking-tight leading-none" style={textPrimary}>{value}</p>
        <p className="text-sm font-semibold mt-1" style={textSecondary}>{title}</p>
        <p className="text-xs mt-0.5" style={textMuted}>{subtitle}</p>
      </div>
    </div>
  );
}

/* ── QuickCard ── */
function QuickCard({
  href, title, subtitle, icon: Icon,
}: {
  href: string; title: string; subtitle: string; icon: React.ElementType;
}) {
  return (
    <Link href={href} className="flex h-44 p-5 flex-col justify-between group" style={card}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-base font-semibold" style={textPrimary}>{title}</p>
          <p className="text-xs mt-0.5" style={textMuted}>{subtitle}</p>
        </div>
        <div className="h-8 w-8 flex items-center justify-center transition-colors group-hover:bg-white/30" style={iconWrap}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const { activeCinema, totalValorant, recentCinema } = await getStats();

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-fade-up">

      {/* ── Row 1 : 4 stat/quick cards ── */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Cinéma actif"  subtitle="Séances en cours"   value={activeCinema}   icon={Clapperboard} />
        <StatCard title="Valorant"       subtitle="Comptes liés"        value={totalValorant}  icon={Crosshair}    />
        <StatCard title="Bot Discord"    subtitle="Disponibilité"       value="100%"           icon={Activity}     />
        <QuickCard href="/membres"    title="Membres"   subtitle="Gestion du serveur" icon={Users}    />
      </div>

      {/* ── Row 2 : Séances récentes + 2 quick cards ── */}
      <div className="grid grid-cols-4 gap-4">

        {/* Séances — 2 cols */}
        <div className="col-span-2 p-5" style={card}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-base font-semibold" style={textPrimary}>Séances cinéma récentes</p>
              <p className="text-xs mt-0.5" style={textMuted}>Activité en temps réel</p>
            </div>
            <TrendingUp className="h-4 w-4" style={{ color: "rgba(255,255,255,0.40)" }} />
          </div>

          <div className="space-y-1">
            {recentCinema.length === 0 ? (
              <p className="text-sm py-6 text-center" style={textMuted}>Aucune séance pour l'instant.</p>
            ) : (
              recentCinema.map((party) => (
                <div
                  key={party.messageId}
                  className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{
                        background: party.status === "active" ? "#4ADE80" : "rgba(255,255,255,0.25)",
                        boxShadow: party.status === "active" ? "0 0 6px rgba(74,222,128,0.7)" : undefined,
                      }}
                    />
                    <span className="text-sm font-medium truncate" style={textSecondary}>{party.title}</span>
                  </div>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ml-2"
                    style={
                      party.status === "active"
                        ? { color: "#4ADE80", background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.25)" }
                        : { color: "rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.08)" }
                    }
                  >
                    {party.status === "active" ? "En cours" : "Terminé"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <QuickCard href="/logs"   title="Logs"   subtitle="Historique des actions" icon={ScrollText} />
        <QuickCard href="/steam"  title="Steam"  subtitle="Catalogue de jeux"      icon={Gamepad2}   />
      </div>

      {/* ── Row 3 : Commandes + Paramètres ── */}
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-3 p-5" style={card}>
          <p className="text-base font-semibold mb-4" style={textPrimary}>Commandes disponibles</p>
          <CommandsReference commands={[
            {
              name: "/roulette",
              description: "Tire au sort un membre parmi une sélection de 2 à 10 participants. Le résultat est annoncé publiquement avec un ping.",
              params: [{ name: "(aucun paramètre)", description: "Un sélecteur de membres Discord s'ouvre directement.", required: false }],
            },
          ]} />
        </div>
        <QuickCard href="/parametres" title="Paramètres" subtitle="Configuration du bot" icon={Settings} />
      </div>

    </div>
  );
}

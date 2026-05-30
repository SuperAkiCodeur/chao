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

/* Shared glass style */
const card = {
  background: "rgba(255, 255, 255, 0.68)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255, 255, 255, 0.90)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)",
  borderRadius: "20px",
} as const;

/* Badge circle (bottom-right count) */
function Badge({ n, color = "bg-slate-800" }: { n: number | string; color?: string }) {
  return (
    <div className={`h-8 w-8 rounded-full ${color} flex items-center justify-center text-sm font-semibold text-white shrink-0`}>
      {n}
    </div>
  );
}

/* ── Stat card (tall, with icon + big number) ── */
function StatCard({
  title, subtitle, value, icon: Icon, iconBg, accent,
}: {
  title: string; subtitle: string; value: number | string;
  icon: React.ElementType; iconBg: string; accent: string;
}) {
  return (
    <div className="p-5 flex flex-col gap-3 h-44" style={card}>
      <div className="flex items-center justify-between">
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className="h-[18px] w-[18px]" style={{ color: accent }} />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Live
        </span>
      </div>
      <div className="mt-auto">
        <p className="text-3xl font-bold text-slate-900 tracking-tight leading-none">{value}</p>
        <p className="text-sm font-semibold text-slate-700 mt-1">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

/* ── Quick link card ── */
function QuickCard({
  href, title, subtitle, icon: Icon, count,
}: {
  href: string; title: string; subtitle: string;
  icon: React.ElementType; count?: number;
}) {
  return (
    <Link href={href} className="flex h-44 p-5 flex-col justify-between group" style={card}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-base font-semibold text-slate-800 leading-tight">{title}</p>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
          <Icon className="h-4 w-4 text-slate-500" />
        </div>
      </div>
      {count !== undefined && (
        <div className="flex justify-end">
          <Badge n={count} />
        </div>
      )}
    </Link>
  );
}

export default async function HomePage() {
  const { activeCinema, totalValorant, recentCinema } = await getStats();

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-fade-up">

      {/* ── Row 1: 4 cards ── */}
      <div className="grid grid-cols-4 gap-4">

        {/* Cinéma stat */}
        <StatCard
          title="Cinéma actif"
          subtitle="Séances en cours"
          value={activeCinema}
          icon={Clapperboard}
          iconBg="bg-sky-50"
          accent="#0284C7"
        />

        {/* Valorant stat */}
        <StatCard
          title="Valorant"
          subtitle="Comptes liés"
          value={totalValorant}
          icon={Crosshair}
          iconBg="bg-rose-50"
          accent="#E11D48"
        />

        {/* Bot status */}
        <StatCard
          title="Bot Discord"
          subtitle="Disponibilité"
          value="100%"
          icon={Activity}
          iconBg="bg-emerald-50"
          accent="#10B981"
        />

        {/* Membres quick link */}
        <QuickCard
          href="/membres"
          title="Membres"
          subtitle="Gestion du serveur"
          icon={Users}
        />

      </div>

      {/* ── Row 2: Séances récentes (large) + 2 quick cards ── */}
      <div className="grid grid-cols-4 gap-4">

        {/* Séances récentes — 2 cols */}
        <div className="col-span-2 p-5" style={card}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-base font-semibold text-slate-800">Séances cinéma récentes</p>
              <p className="text-xs text-slate-400">Activité en temps réel</p>
            </div>
            <TrendingUp className="h-4 w-4 text-slate-300" />
          </div>

          <div className="space-y-1">
            {recentCinema.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">Aucune séance pour l'instant.</p>
            ) : (
              recentCinema.map((party) => (
                <div
                  key={party.messageId}
                  className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-black/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{
                        background: party.status === "active" ? "#10B981" : "#CBD5E1",
                        boxShadow: party.status === "active" ? "0 0 6px rgba(16,185,129,0.6)" : undefined,
                      }}
                    />
                    <span className="text-sm font-medium text-slate-700 truncate">{party.title}</span>
                  </div>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ml-2"
                    style={
                      party.status === "active"
                        ? { color: "#059669", background: "rgba(16,185,129,0.10)" }
                        : { color: "#94A3B8", background: "rgba(148,163,184,0.10)" }
                    }
                  >
                    {party.status === "active" ? "En cours" : "Terminé"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Logs */}
        <QuickCard
          href="/logs"
          title="Logs"
          subtitle="Historique des actions"
          icon={ScrollText}
        />

        {/* Steam */}
        <QuickCard
          href="/steam"
          title="Steam"
          subtitle="Catalogue de jeux"
          icon={Gamepad2}
        />

      </div>

      {/* ── Row 3: Commandes (large) + Paramètres ── */}
      <div className="grid grid-cols-4 gap-4">

        {/* Commandes — 3 cols */}
        <div className="col-span-3 p-5" style={card}>
          <div className="flex items-center gap-2 mb-4">
            <p className="text-base font-semibold text-slate-800">Commandes disponibles</p>
          </div>
          <CommandsReference commands={[
            {
              name: "/roulette",
              description: "Tire au sort un membre parmi une sélection de 2 à 10 participants. Le résultat est annoncé publiquement avec un ping.",
              params: [{ name: "(aucun paramètre)", description: "Un sélecteur de membres Discord s'ouvre directement.", required: false }],
            },
          ]} />
        </div>

        {/* Paramètres */}
        <QuickCard
          href="/parametres"
          title="Paramètres"
          subtitle="Configuration du bot"
          icon={Settings}
        />

      </div>

    </div>
  );
}

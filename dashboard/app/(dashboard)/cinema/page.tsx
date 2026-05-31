import { db } from "@/lib/db";
import { cinemaParties, cinemaPartyUsers, cinemaPartyRatings } from "@/lib/schema";
import { eq, desc, count, avg } from "drizzle-orm";
import { Clapperboard } from "lucide-react";
import { CinemaClient } from "./CinemaClient";
import { FeatureSettings, type DiscordChannel, type DiscordRole } from "@/components/FeatureSettings";
import { CommandsReference } from "@/components/CommandsReference";
import { ApiAttribution } from "@/components/ApiAttribution";
import { getAllSettings } from "@/lib/settings";
import { PageShell, StatCard, SectionCard } from "@/components/PageShell";

export const dynamic = "force-dynamic";

const TMDB_KEY   = process.env.TMDB_API_KEY;
const POSTER_BASE = "https://image.tmdb.org/t/p/w300";

async function getData() {
  const parties = await db.select().from(cinemaParties).orderBy(desc(cinemaParties.viewingAt)).limit(30);
  return Promise.all(parties.map(async (party) => {
    const [{ participants }] = await db.select({ participants: count() }).from(cinemaPartyUsers).where(eq(cinemaPartyUsers.messageId, party.messageId));
    const [{ avgRating }]    = await db.select({ avgRating: avg(cinemaPartyRatings.rating) }).from(cinemaPartyRatings).where(eq(cinemaPartyRatings.messageId, party.messageId));
    return { messageId: party.messageId, title: party.title, mediaType: party.mediaType, mediaId: party.mediaId, viewingAt: party.viewingAt, status: party.status, participants: Number(participants), avgRating: avgRating ? Number(avgRating).toFixed(1) : null };
  }));
}

type TmdbMeta = { posterUrl: string | null; overview: string | null; genres: string[] };
async function fetchTmdbMeta(mediaId: string, mediaType: string): Promise<TmdbMeta> {
  if (!TMDB_KEY || !mediaId || mediaId.startsWith("dashboard-")) return { posterUrl: null, overview: null, genres: [] };
  try {
    const type = mediaType === "movie" ? "movie" : "tv";
    const res = await fetch(`https://api.themoviedb.org/3/${type}/${mediaId}?api_key=${TMDB_KEY}&language=fr-FR`, { next: { revalidate: 3600 } });
    if (!res.ok) return { posterUrl: null, overview: null, genres: [] };
    const d = await res.json() as { poster_path?: string | null; overview?: string; genres?: { name: string }[] };
    return { posterUrl: d.poster_path ? `${POSTER_BASE}${d.poster_path}` : null, overview: d.overview?.trim() || null, genres: d.genres?.map(g => g.name) ?? [] };
  } catch { return { posterUrl: null, overview: null, genres: [] }; }
}

async function getDiscord() {
  const GUILD_ID = process.env.DISCORD_GUILD_ID!;
  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;
  const [chRes, roRes] = await Promise.all([
    fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/channels`, { headers: { Authorization: `Bot ${BOT_TOKEN}` }, cache: "no-store" }),
    fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`,    { headers: { Authorization: `Bot ${BOT_TOKEN}` }, cache: "no-store" }),
  ]);
  const channels: DiscordChannel[] = chRes.ok ? await chRes.json() : [];
  const roles: DiscordRole[]       = roRes.ok ? await roRes.json() : [];
  return { channels, roles };
}

export default async function CinemaPage() {
  const [parties, { channels, roles }, settings] = await Promise.all([getData(), getDiscord(), getAllSettings()]);
  const upcoming     = parties.filter(p => p.status === "active");
  const upcomingMeta = await Promise.all(upcoming.map(p => fetchTmdbMeta(p.mediaId, p.mediaType)));

  return (
    <PageShell title="Cinéma" description="Séances programmées et historique des diffusions">

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
        <StatCard value={upcoming.length} label="Séances actives"    sub="en ce moment"   />
        <StatCard value={parties.length}  label="Séances au total"   sub="dans l'historique" />
      </div>

      {/* Prochainement */}
      {upcoming.length > 0 && (
        <SectionCard title="Prochainement">
          <div style={{ padding: "12px 20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            {upcoming.map((p, i) => {
              const meta = upcomingMeta[i];
              const date = new Date(p.viewingAt);
              return (
                <div key={p.messageId} style={{ display: "flex", gap: 14, background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 12 }}>
                  {meta.posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={meta.posterUrl} alt={p.title} style={{ width: 56, borderRadius: 8, objectFit: "cover", aspectRatio: "2/3", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 56, borderRadius: 8, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", aspectRatio: "2/3", flexShrink: 0 }}>
                      <Clapperboard size={18} style={{ color: "rgba(255,255,255,0.20)" }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{p.title}</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{meta.genres.length > 0 ? meta.genres.join(", ") : (p.mediaType === "movie" ? "Film" : "Série")}</p>
                    {meta.overview && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{meta.overview}</p>}
                    <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.60)", marginTop: 8 }}>
                      {date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* All sessions */}
      <SectionCard title="Séances">
        <div>
          <CinemaClient parties={parties} />
        </div>
      </SectionCard>

      <FeatureSettings channels={channels} roles={roles} settings={settings} fields={[
        { key: "cinema_channel_id",         label: "Salon d'annonces", description: "Salon où les séances sont publiées",   kind: "channel" },
        { key: "cinema_spectator_role_id",  label: "Rôle spectateur",  description: "Rôle attribué aux participants",       kind: "role"    },
      ]} />

      <CommandsReference commands={[{
        name: "/cinema", description: "Ouvre un menu éphémère avec trois actions :", adminOnly: true,
        params: [
          { name: "🎬 Programmer une diffusion", description: "Ouvre un formulaire : type, titre, date et heure. Le bot recherche les métadonnées sur TMDB puis publie l'annonce.", required: false },
          { name: "⏹ Terminer une diffusion",    description: "Clôt une diffusion active et ouvre un vote de notation pendant 1 heure.",                                          required: false },
          { name: "❓ Aide",                      description: "Affiche la liste de toutes les actions disponibles.",                                                               required: false },
        ],
      }]} />

      <ApiAttribution name="The Movie Database (TMDB)" url="https://www.themoviedb.org/" description="métadonnées des films et séries" />

    </PageShell>
  );
}

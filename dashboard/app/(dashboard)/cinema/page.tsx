import { db } from "@/lib/db";
import { cinemaParties, cinemaPartyUsers, cinemaPartyRatings } from "@/lib/schema";
import { eq, desc, count, avg } from "drizzle-orm";
import { CinemaClient, type PartyWithMeta } from "./CinemaClient";
import { FeatureSettings, type DiscordChannel, type DiscordRole } from "@/components/FeatureSettings";
import { ApiAttribution } from "@/components/ApiAttribution";
import { getAllSettings } from "@/lib/settings";
import { PageShell } from "@/components/PageShell";

export const dynamic = "force-dynamic";

const TMDB_KEY    = process.env.TMDB_API_KEY;
const POSTER_BASE = "https://image.tmdb.org/t/p/w300";

async function getData() {
  const parties = await db.select().from(cinemaParties).orderBy(desc(cinemaParties.viewingAt)).limit(50);
  return Promise.all(parties.map(async (party) => {
    const [{ participants }] = await db.select({ participants: count() }).from(cinemaPartyUsers).where(eq(cinemaPartyUsers.messageId, party.messageId));
    const [{ avgRating }]    = await db.select({ avgRating: avg(cinemaPartyRatings.rating) }).from(cinemaPartyRatings).where(eq(cinemaPartyRatings.messageId, party.messageId));
    return {
      messageId:    party.messageId,
      title:        party.title,
      mediaType:    party.mediaType,
      mediaId:      party.mediaId,
      viewingAt:    party.viewingAt,
      status:       party.status,
      participants: Number(participants),
      avgRating:    avgRating ? Number(avgRating).toFixed(1) : null,
    };
  }));
}

async function fetchTmdbMeta(mediaId: string, mediaType: string) {
  if (!TMDB_KEY || !mediaId || mediaId.startsWith("dashboard-")) return { posterUrl: null, overview: null, genres: [] };
  try {
    const type = mediaType === "movie" ? "movie" : "tv";
    const res = await fetch(`https://api.themoviedb.org/3/${type}/${mediaId}?api_key=${TMDB_KEY}&language=fr-FR`, { next: { revalidate: 3600 } });
    if (!res.ok) return { posterUrl: null, overview: null, genres: [] };
    const d = await res.json() as { poster_path?: string | null; overview?: string; genres?: { name: string }[] };
    return {
      posterUrl: d.poster_path ? `${POSTER_BASE}${d.poster_path}` : null,
      overview:  d.overview?.trim() || null,
      genres:    d.genres?.map(g => g.name) ?? [],
    };
  } catch { return { posterUrl: null, overview: null, genres: [] }; }
}

async function getDiscord() {
  const GUILD_ID  = process.env.DISCORD_GUILD_ID!;
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

  const allMeta = await Promise.all(parties.map(p => fetchTmdbMeta(p.mediaId, p.mediaType)));
  const partiesWithMeta: PartyWithMeta[] = parties.map((p, i) => ({ ...p, meta: allMeta[i] }));

  return (
    <PageShell title="Cinéma" description="Séances programmées et historique des diffusions">

      <CinemaClient partiesWithMeta={partiesWithMeta} />

      <FeatureSettings
        channels={channels}
        roles={roles}
        settings={settings}
        noCollapse
        fields={[
          { key: "cinema_channel_id",        label: "Salon d'annonces", description: "Salon où les séances sont publiées", kind: "channel" },
          { key: "cinema_spectator_role_id", label: "Rôle spectateur",  description: "Rôle attribué aux participants",     kind: "role"    },
        ]}
      />

      <ApiAttribution name="The Movie Database (TMDB)" url="https://www.themoviedb.org/" description="métadonnées des films et séries" />

    </PageShell>
  );
}

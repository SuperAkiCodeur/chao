import { db } from "@/lib/db";
import { cinemaParties, cinemaPartyUsers, cinemaPartyRatings } from "@/lib/schema";
import { eq, desc, count, avg } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clapperboard } from "lucide-react";
import { CinemaClient } from "./CinemaClient";
import { FeatureSettings, type DiscordChannel, type DiscordRole } from "@/components/FeatureSettings";
import { CommandsReference } from "@/components/CommandsReference";
import { ApiAttribution } from "@/components/ApiAttribution";
import { getAllSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const TMDB_KEY = process.env.TMDB_API_KEY;
const POSTER_BASE = "https://image.tmdb.org/t/p/w300";

async function getData() {
  const parties = await db
    .select()
    .from(cinemaParties)
    .orderBy(desc(cinemaParties.viewingAt))
    .limit(30);

  return Promise.all(
    parties.map(async (party) => {
      const [{ participants }] = await db
        .select({ participants: count() })
        .from(cinemaPartyUsers)
        .where(eq(cinemaPartyUsers.messageId, party.messageId));

      const [{ avgRating }] = await db
        .select({ avgRating: avg(cinemaPartyRatings.rating) })
        .from(cinemaPartyRatings)
        .where(eq(cinemaPartyRatings.messageId, party.messageId));

      return {
        messageId: party.messageId,
        title: party.title,
        mediaType: party.mediaType,
        mediaId: party.mediaId,
        viewingAt: party.viewingAt,
        status: party.status,
        participants: Number(participants),
        avgRating: avgRating ? Number(avgRating).toFixed(1) : null,
      };
    }),
  );
}

type TmdbMeta = { posterUrl: string | null; overview: string | null; genres: string[] };

async function fetchTmdbMeta(mediaId: string, mediaType: string): Promise<TmdbMeta> {
  if (!TMDB_KEY || !mediaId || mediaId.startsWith("dashboard-")) {
    return { posterUrl: null, overview: null, genres: [] };
  }
  try {
    const type = mediaType === "movie" ? "movie" : "tv";
    const res = await fetch(
      `https://api.themoviedb.org/3/${type}/${mediaId}?api_key=${TMDB_KEY}&language=fr-FR`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return { posterUrl: null, overview: null, genres: [] };
    const d = await res.json() as {
      poster_path?: string | null;
      overview?: string;
      genres?: { name: string }[];
    };
    return {
      posterUrl: d.poster_path ? `${POSTER_BASE}${d.poster_path}` : null,
      overview: d.overview?.trim() || null,
      genres: d.genres?.map(g => g.name) ?? [],
    };
  } catch {
    return { posterUrl: null, overview: null, genres: [] };
  }
}

const GUILD_ID = process.env.DISCORD_GUILD_ID!;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

async function getDiscord() {
  const [chRes, roRes] = await Promise.all([
    fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/channels`, { headers: { Authorization: `Bot ${BOT_TOKEN}` }, cache: "no-store" }),
    fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, { headers: { Authorization: `Bot ${BOT_TOKEN}` }, cache: "no-store" }),
  ]);
  if (!chRes.ok) console.error("[cinema] channels fetch failed", chRes.status, await chRes.text().catch(() => ""));
  if (!roRes.ok) console.error("[cinema] roles fetch failed", roRes.status, await roRes.text().catch(() => ""));
  const channels: DiscordChannel[] = chRes.ok ? await chRes.json() : [];
  const roles: DiscordRole[] = roRes.ok ? await roRes.json() : [];
  return { channels, roles };
}

export default async function CinemaPage() {
  const [parties, { channels, roles }, settings] = await Promise.all([getData(), getDiscord(), getAllSettings()]);
  const upcoming = parties.filter((p) => p.status === "active");
  const upcomingMeta = await Promise.all(
    upcoming.map(p => fetchTmdbMeta(p.mediaId, p.mediaType))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Cinéma</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Séances programmées et historique des diffusions</p>
      </div>

      {/* Films programmés */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600/10 shrink-0">
              <Clapperboard className="h-4 w-4 text-rose-600" />
            </div>
            <p className="text-sm font-medium text-foreground">Prochainement</p>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun film programmé.</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((p, i) => {
                const meta = upcomingMeta[i];
                const date = new Date(p.viewingAt);
                return (
                  <div key={p.messageId} className="flex gap-3 rounded-lg bg-muted/40 p-3">
                    {/* Poster */}
                    {meta.posterUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={meta.posterUrl}
                        alt={p.title}
                        className="w-16 rounded shrink-0 object-cover"
                        style={{ aspectRatio: "2/3" }}
                      />
                    ) : (
                      <div
                        className="w-16 rounded bg-muted shrink-0 flex items-center justify-center"
                        style={{ aspectRatio: "2/3" }}
                      >
                        <Clapperboard className="h-5 w-5 text-muted-foreground/30" />
                      </div>
                    )}
                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{p.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {meta.genres.length > 0
                            ? meta.genres.join(", ")
                            : (p.mediaType === "movie" ? "Film" : "Série")}
                        </p>
                        {meta.overview && (
                          <p className="text-xs text-muted-foreground/70 mt-1.5 line-clamp-2">{meta.overview}</p>
                        )}
                      </div>
                      <p className="text-xs font-medium text-foreground mt-2">
                        {date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                        {" à "}
                        {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold text-foreground">Séances</CardTitle>
        </CardHeader>
        <CardContent>
          <CinemaClient parties={parties} />
        </CardContent>
      </Card>

      <FeatureSettings
        channels={channels}
        roles={roles}
        settings={settings}
        fields={[
          { key: "cinema_channel_id", label: "Salon d'annonces", description: "Salon où les séances sont publiées", kind: "channel" },
          { key: "cinema_spectator_role_id", label: "Rôle spectateur", description: "Rôle attribué aux participants", kind: "role" },
        ]}
      />

      <CommandsReference commands={[
        {
          name: "/cinema",
          description:
            "Ouvre un menu éphémère (visible uniquement par toi) avec trois actions disponibles :",
          adminOnly: true,
          params: [
            {
              name: "🎬 Programmer une diffusion",
              description:
                "Ouvre un formulaire : type (film / serie), titre, date (JJ/MM/AA) et heure (HH:MM). Le bot recherche les métadonnées sur TMDB puis publie l'annonce dans le salon configuré. Un rappel est posté automatiquement à l'heure du visionnage.",
              required: false,
            },
            {
              name: "⏹ Terminer une diffusion",
              description:
                "Clôt une diffusion active et ouvre un vote de notation (⭐ à ⭐⭐⭐⭐⭐) pendant 1 heure. Le récapitulatif des notes est publié automatiquement à la fermeture.",
              required: false,
            },
            {
              name: "❓ Aide",
              description: "Affiche la liste de toutes les actions disponibles directement dans le menu.",
              required: false,
            },
          ],
          note: "Réservée aux administrateurs (permission Gérer le serveur).",
        },
      ]} />

      <ApiAttribution
        name="The Movie Database (TMDB)"
        url="https://www.themoviedb.org/"
        description="métadonnées des films et séries"
      />
    </div>
  );
}

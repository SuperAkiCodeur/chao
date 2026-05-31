"use server";

import { db } from "@/lib/db";
import { cinemaParties, cinemaPartyRatings } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { addLog } from "@/lib/logger";
import { getSetting, SETTING_KEYS } from "@/lib/settings";

export type ActionResult = { success: true } | { success: false; error: string };

const GUILD_ID = process.env.DISCORD_GUILD_ID!;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;
const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";
const POSTER_BASE = "https://image.tmdb.org/t/p/w500";

function discordHeaders() {
  return { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" };
}

// ── TMDB ─────────────────────────────────────────────────────────────────────

export type TmdbResult = {
  mediaId: string;
  resolvedTitle: string;
  posterUrl: string | null;
  overview: string | null;
  genres: string[];
  releaseDate: string | null;
  runtime: string | null;
  director: string | null;
};

function formatRuntime(minutes?: number | null): string | null {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}min` : `${m} min`;
}

function formatDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString("fr-FR");
}

export type TmdbSearchResponse =
  | { ok: true; result: TmdbResult }
  | { ok: false; error: string };

export async function searchTmdbAction(title: string, type: string): Promise<TmdbSearchResponse> {
  if (!TMDB_KEY) {
    return { ok: false, error: "TMDB_API_KEY manquant — ajoute-le dans les variables d'environnement Vercel." };
  }
  const mediaType = type === "tv" ? "tv" : "movie";
  try {
    const searchRes = await fetch(
      `${TMDB_BASE}/search/${mediaType}?api_key=${TMDB_KEY}&query=${encodeURIComponent(title)}&language=fr-FR&include_adult=false`,
    );
    if (!searchRes.ok) {
      console.error("[tmdb] search failed", searchRes.status, await searchRes.text().catch(() => ""));
      return { ok: false, error: `Erreur TMDB (${searchRes.status}). Réessaie.` };
    }
    const searchData = await searchRes.json() as { results?: Array<{ id: number; title?: string; name?: string }> };
    if (!searchData.results?.length) {
      return { ok: false, error: "Aucun résultat pour ce titre. Essaie le titre original (anglais/VO)." };
    }

    const best = searchData.results[0];
    const mediaId = String(best.id);

    const [detailsRes, creditsRes] = await Promise.all([
      fetch(`${TMDB_BASE}/${mediaType}/${mediaId}?api_key=${TMDB_KEY}&language=fr-FR`),
      fetch(`${TMDB_BASE}/${mediaType}/${mediaId}/credits?api_key=${TMDB_KEY}&language=fr-FR`),
    ]);

    const details = await detailsRes.json() as {
      title?: string; name?: string; overview?: string; poster_path?: string | null;
      release_date?: string; first_air_date?: string; runtime?: number | null;
      episode_run_time?: number[]; genres?: { name: string }[];
      created_by?: { name: string }[];
    };
    const credits = await creditsRes.json() as { crew?: { name: string; job?: string }[] };

    const resolvedTitle = mediaType === "movie"
      ? (details.title ?? best.title ?? title)
      : (details.name  ?? best.name  ?? title);

    const director = mediaType === "movie"
      ? (credits.crew?.find(p => p.job === "Director")?.name ?? null)
      : (details.created_by?.map(p => p.name).join(", ") || null);

    const runtimeMin = mediaType === "movie" ? details.runtime : details.episode_run_time?.[0];
    const releaseRaw = mediaType === "movie" ? details.release_date : details.first_air_date;

    return {
      ok: true,
      result: {
        mediaId,
        resolvedTitle,
        posterUrl: details.poster_path ? `${POSTER_BASE}${details.poster_path}` : null,
        overview: details.overview?.trim() || null,
        genres: details.genres?.map(g => g.name) ?? [],
        releaseDate: formatDate(releaseRaw),
        runtime: formatRuntime(runtimeMin),
        director,
      },
    };
  } catch (err) {
    console.error("[tmdb] search error", err);
    return { ok: false, error: "Erreur réseau lors de la recherche TMDB." };
  }
}

// ── Lancer ────────────────────────────────────────────────────────────────────

export async function launchCinemaParty(params: {
  mediaType: string;
  date: string;
  time: string;
  tmdb: TmdbResult;
}): Promise<ActionResult> {
  const { mediaType, date, time, tmdb } = params;

  const [TICKET_CHANNEL_ID, SPECTATOR_ROLE_ID] = await Promise.all([
    getSetting(SETTING_KEYS.CINEMA_CHANNEL_ID),
    getSetting(SETTING_KEYS.CINEMA_SPECTATOR_ROLE_ID),
  ]);

  if (!TICKET_CHANNEL_ID || !SPECTATOR_ROLE_ID) {
    return { success: false, error: "Configure le salon et le rôle spectateur dans les Paramètres." };
  }

  const viewingAt = new Date(`${date}T${time}:00`);
  if (isNaN(viewingAt.getTime())) {
    return { success: false, error: "Date ou heure invalide." };
  }

  const viewingFormatted = viewingAt.toLocaleString("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris",
  });

  // Embed identique au bot (couleur 0xe91e63, mêmes champs)
  const embed: Record<string, unknown> = {
    title: `🎬 ${tmdb.resolvedTitle}`,
    description: tmdb.overview ?? "Synopsis indisponible.",
    color: 0xe91e63,
    fields: [
      { name: "Type",        value: mediaType === "movie" ? "Film" : "Série",           inline: true },
      { name: mediaType === "movie" ? "Réalisateur" : "Créateur",
        value: tmdb.director ?? "Inconnu",                                               inline: true },
      { name: mediaType === "movie" ? "Sortie" : "Première diffusion",
        value: tmdb.releaseDate ?? "Inconnue",                                           inline: true },
      { name: mediaType === "movie" ? "Durée" : "Durée épisode",
        value: tmdb.runtime ?? "Inconnue",                                               inline: true },
      { name: "Genres",      value: tmdb.genres.join(", ") || "Inconnus",               inline: false },
      { name: "Visionnage",  value: viewingFormatted,                                   inline: false },
    ],
  };
  if (tmdb.posterUrl) embed.image = { url: tmdb.posterUrl };

  const msgRes = await fetch(`https://discord.com/api/v10/channels/${TICKET_CHANNEL_ID}/messages`, {
    method: "POST",
    headers: discordHeaders(),
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (!msgRes.ok) {
    const err = await msgRes.json().catch(() => ({})) as { message?: string };
    return { success: false, error: `Impossible de poster l'annonce : ${err.message ?? msgRes.status}` };
  }

  const msg = await msgRes.json() as { id: string };

  try {
    await db.insert(cinemaParties).values({
      messageId: msg.id,
      guildId: GUILD_ID,
      channelId: TICKET_CHANNEL_ID,
      roleId: SPECTATOR_ROLE_ID,
      title: tmdb.resolvedTitle,
      mediaType,
      mediaId: tmdb.mediaId,
      viewingAt: viewingAt.toISOString(),
      status: "active",
    });
  } catch {
    return { success: false, error: "Annonce postée, mais erreur lors de l'enregistrement en base." };
  }

  void addLog({
    type: "cinema",
    action: "party_created",
    description: `📺 ${mediaType === "movie" ? "Film" : "Série"} programmé depuis le dashboard : « ${tmdb.resolvedTitle} » le ${viewingFormatted}`,
    metadata: { title: tmdb.resolvedTitle, mediaType, viewingAt: viewingAt.toISOString(), mediaId: tmdb.mediaId },
  });

  revalidatePath("/cinema");
  return { success: true };
}

// ── Terminer ──────────────────────────────────────────────────────────────────

export async function endCinemaParty(messageId: string, title: string, rating?: number): Promise<ActionResult> {
  try {
    await db
      .update(cinemaParties)
      .set({ status: "ended" })
      .where(and(eq(cinemaParties.messageId, messageId), eq(cinemaParties.guildId, GUILD_ID)));

    if (rating && rating >= 1 && rating <= 5) {
      await db
        .insert(cinemaPartyRatings)
        .values({ messageId, userId: "dashboard", rating })
        .onConflictDoUpdate({
          target: [cinemaPartyRatings.messageId, cinemaPartyRatings.userId],
          set: { rating },
        });
    }

    void addLog({
      type: "cinema",
      action: "party_ended",
      description: `✅ Diffusion terminée : « ${title} »`,
      metadata: { messageId, title },
    });

    revalidatePath("/cinema");
    return { success: true };
  } catch {
    return { success: false, error: "Erreur lors de la mise à jour." };
  }
}

// ── Annuler ───────────────────────────────────────────────────────────────────

export async function cancelCinemaParty(messageId: string, title: string): Promise<ActionResult> {
  const TICKET_CHANNEL_ID = await getSetting(SETTING_KEYS.CINEMA_CHANNEL_ID);
  try {
    if (TICKET_CHANNEL_ID) {
      await fetch(`https://discord.com/api/v10/channels/${TICKET_CHANNEL_ID}/messages/${messageId}`, {
        method: "DELETE",
        headers: discordHeaders(),
      }).catch(() => null);
    }

    await db
      .delete(cinemaParties)
      .where(and(eq(cinemaParties.messageId, messageId), eq(cinemaParties.guildId, GUILD_ID)));

    void addLog({
      type: "cinema",
      action: "party_cancelled",
      description: `❌ Diffusion annulée : « ${title} »`,
      metadata: { messageId, title },
    });

    revalidatePath("/cinema");
    return { success: true };
  } catch {
    return { success: false, error: "Erreur lors de la suppression." };
  }
}

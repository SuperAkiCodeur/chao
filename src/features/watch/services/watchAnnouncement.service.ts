import { EmbedBuilder } from "discord.js";
import { WATCH_CONSTANTS } from "../domain/watch.constants.js";
import type {
  BuildWatchAnnouncementParams,
  BuildWatchAnnouncementResult,
} from "../domain/watch.types.js";
import {
  buildTmdbPosterUrl,
  resolveTmdbAuthor,
  resolveTmdbReleaseDate,
  resolveTmdbRuntime,
  resolveTmdbTitle,
} from "./tmdb.service.js";

function formatRuntime(minutes: number | null): string {
  if (!minutes || Number.isNaN(minutes)) {
    return "Inconnue";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours <= 0) {
    return `${remainingMinutes} min`;
  }

  return `${hours}h ${remainingMinutes.toString().padStart(2, "0")}min`;
}

function formatReleaseDate(date: string | null): string {
  if (!date) {
    return "Inconnue";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Inconnue";
  }

  return parsedDate.toLocaleDateString("fr-FR");
}

export function buildWatchAnnouncement(
  params: BuildWatchAnnouncementParams,
): BuildWatchAnnouncementResult {
  const resolvedTitle = resolveTmdbTitle(
    params.type,
    params.title,
    params.details,
    params.bestMatch,
  );

  const author = resolveTmdbAuthor(
    params.type,
    params.details,
    params.credits,
  );

  const releaseDate = formatReleaseDate(
    resolveTmdbReleaseDate(params.type, params.details),
  );

  const runtime = formatRuntime(
    resolveTmdbRuntime(params.type, params.details),
  );

  const genres = params.details.genres?.length
    ? params.details.genres.map((genre) => genre.name).join(", ")
    : "Inconnus";

  const posterUrl = buildTmdbPosterUrl(params.details.poster_path);
  const overview = params.details.overview?.trim() || "Synopsis indisponible.";

  const embed = new EmbedBuilder()
    .setTitle(`🎬 ${resolvedTitle}`)
    .setDescription(overview)
    .addFields(
      {
        name: "Type",
        value:
          params.type === WATCH_CONSTANTS.MEDIA_TYPES.MOVIE ? "Film" : "Série",
        inline: true,
      },
      {
        name: author.label,
        value: author.value,
        inline: true,
      },
      {
        name:
          params.type === WATCH_CONSTANTS.MEDIA_TYPES.MOVIE
            ? "Sortie"
            : "Première diffusion",
        value: releaseDate,
        inline: true,
      },
      {
        name:
          params.type === WATCH_CONSTANTS.MEDIA_TYPES.MOVIE
            ? "Durée"
            : "Durée épisode",
        value: runtime,
        inline: true,
      },
      {
        name: "Genres",
        value: genres,
        inline: false,
      },
      {
        name: "Visionnage",
        value: `${params.date} à ${params.time}`,
        inline: false,
      },
      {
        name: "Billetterie",
        value: `Réagis avec ${WATCH_CONSTANTS.TICKET_EMOJI} pour réserver ta place.`,
        inline: false,
      },
    )
    .setColor(WATCH_CONSTANTS.DEFAULT_EMBED_COLOR);

  if (posterUrl) {
    embed.setImage(posterUrl);
  }

  return {
    embed,
    resolvedTitle,
  };
}
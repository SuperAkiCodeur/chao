import type { ChatInputCommandInteraction } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { CINEMA_CONSTANTS } from "./cinema.constants.js";

export type CinemaContentType =
  (typeof CINEMA_CONSTANTS.MEDIA_TYPES)[keyof typeof CINEMA_CONSTANTS.MEDIA_TYPES];

export type CinemaStatus =
  | typeof CINEMA_CONSTANTS.ACTIVE_STATUS
  | typeof CINEMA_CONSTANTS.ENDED_STATUS;

export type CinemaRatingValue = 1 | 2 | 3 | 4 | 5;

export type CinemaRatings = Record<string, CinemaRatingValue>;

export type StartCinemaPartyParams = {
  interaction: ChatInputCommandInteraction;
  type: CinemaContentType;
  title: string;
  date: string;
  time: string;
};

export type EndCinemaPartyParams = {
  interaction: ChatInputCommandInteraction;
  type: CinemaContentType;
  title: string;
};

export type CinemaCommandResult = {
  message: string;
};

export type CinemaParty = {
  guildId: string;
  channelId: string;
  messageId: string;
  roleId: string;
  title: string;
  mediaType: CinemaContentType;
  mediaId: string;
  viewingAt: string;
  status: CinemaStatus;
  createdBy?: string;
  users: string[];
  startAnnouncementMessageId?: string;
  ratingChannelId?: string;
  ratingMessageId?: string;
  ratingSummaryMessageId?: string;
  ratingClosesAt?: string;
  ratings?: CinemaRatings;
};


export type TmdbSearchResult = {
  id: number;
  title?: string;
  name?: string;
};

export type TmdbGenre = {
  id: number;
  name: string;
};

export type TmdbCrewPerson = {
  id: number;
  name: string;
  job?: string;
};

export type TmdbCreatedByPerson = {
  id: number;
  name: string;
};

export type TmdbDetails = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  runtime?: number | null;
  episode_run_time?: number[];
  genres?: TmdbGenre[];
  created_by?: TmdbCreatedByPerson[];
};

export type TmdbCredits = {
  crew?: TmdbCrewPerson[];
};

export type TmdbMedia = {
  bestMatch: TmdbSearchResult;
  mediaId: string;
  details: TmdbDetails;
  credits: TmdbCredits;
};

export type BuildCinemaAnnouncementParams = {
  type: CinemaContentType;
  title: string;
  date: string;
  time: string;
  bestMatch?: TmdbSearchResult;
  details: TmdbDetails;
  credits: TmdbCredits;
};

export type BuildCinemaAnnouncementResult = {
  embed: EmbedBuilder;
  resolvedTitle: string;
};
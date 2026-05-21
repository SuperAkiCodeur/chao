import type { ChatInputCommandInteraction } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { WATCH_CONSTANTS } from "./watch.constants.js";

export type WatchContentType =
  (typeof WATCH_CONSTANTS.MEDIA_TYPES)[keyof typeof WATCH_CONSTANTS.MEDIA_TYPES];

export type WatchStatus =
  | typeof WATCH_CONSTANTS.ACTIVE_STATUS
  | typeof WATCH_CONSTANTS.ENDED_STATUS;

export type WatchRatingValue = 1 | 2 | 3 | 4 | 5;

export type WatchRatings = Record<string, WatchRatingValue>;

export type StartWatchPartyParams = {
  interaction: ChatInputCommandInteraction;
  type: WatchContentType;
  title: string;
  date: string;
  time: string;
};

export type EndWatchPartyParams = {
  interaction: ChatInputCommandInteraction;
  type: WatchContentType;
  title: string;
};

export type WatchCommandResult = {
  message: string;
};

export type WatchParty = {
  guildId: string;
  channelId: string;
  messageId: string;
  roleId: string;
  title: string;
  mediaType: WatchContentType;
  mediaId: string;
  viewingAt: string;
  status: WatchStatus;
  users: string[];
  startAnnouncementMessageId?: string;
  ratingChannelId?: string;
  ratingMessageId?: string;
  ratingSummaryMessageId?: string;
  ratingClosesAt?: string;
  ratings?: WatchRatings;
};

export type WatchPartiesData = {
  watchParties: Record<string, WatchParty>;
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

export type BuildWatchAnnouncementParams = {
  type: WatchContentType;
  title: string;
  date: string;
  time: string;
  bestMatch?: TmdbSearchResult;
  details: TmdbDetails;
  credits: TmdbCredits;
};

export type BuildWatchAnnouncementResult = {
  embed: EmbedBuilder;
  resolvedTitle: string;
};
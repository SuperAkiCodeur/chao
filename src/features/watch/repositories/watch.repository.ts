import fs from "node:fs";
import path from "node:path";
import { WATCH_CONSTANTS } from "../domain/watch.constants.js";
import type { WatchContentType, WatchPartiesData, WatchParty } from "../domain/watch.types.js";

const WATCH_PARTIES_FILE_PATH = path.join(
  process.cwd(),
  "data",
  WATCH_CONSTANTS.STORAGE_FILE_NAME,
);

function ensureWatchStorageDirectory(): void {
  const directoryPath = path.dirname(WATCH_PARTIES_FILE_PATH);

  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

export function readWatchParties(): WatchPartiesData {
  ensureWatchStorageDirectory();

  if (!fs.existsSync(WATCH_PARTIES_FILE_PATH)) {
    return { watchParties: {} };
  }

  const fileContent = fs.readFileSync(WATCH_PARTIES_FILE_PATH, "utf8");

  if (!fileContent.trim().length) {
    return { watchParties: {} };
  }

  return JSON.parse(fileContent) as WatchPartiesData;
}

export function writeWatchParties(data: WatchPartiesData): void {
  ensureWatchStorageDirectory();

  fs.writeFileSync(
    WATCH_PARTIES_FILE_PATH,
    JSON.stringify(data, null, 2),
    "utf8",
  );
}

export function findWatchPartyByMessageId(messageId: string): WatchParty | null {
  const data = readWatchParties();
  return data.watchParties[messageId] ?? null;
}

export function findWatchPartyByStartAnnouncementMessageId(
  startAnnouncementMessageId: string,
): WatchParty | null {
  const data = readWatchParties();

  return (
    Object.values(data.watchParties).find((watchParty) => {
      return watchParty.startAnnouncementMessageId === startAnnouncementMessageId;
    }) ?? null
  );
}

export function saveWatchParty(watchParty: WatchParty): void {
  const data = readWatchParties();

  data.watchParties[watchParty.messageId] = watchParty;

  writeWatchParties(data);
}

export function setWatchStartAnnouncementMessageId(
  messageId: string,
  startAnnouncementMessageId: string,
): WatchParty | null {
  const data = readWatchParties();
  const watchParty = data.watchParties[messageId];

  if (!watchParty) {
    return null;
  }

  watchParty.startAnnouncementMessageId = startAnnouncementMessageId;
  writeWatchParties(data);

  return watchParty;
}

export function clearWatchStartAnnouncementMessageId(
  startAnnouncementMessageId: string,
): WatchParty | null {
  const data = readWatchParties();

  const watchPartyEntry = Object.entries(data.watchParties).find(([, watchParty]) => {
    return watchParty.startAnnouncementMessageId === startAnnouncementMessageId;
  });

  if (!watchPartyEntry) {
    return null;
  }

  const [, watchParty] = watchPartyEntry;

  delete watchParty.startAnnouncementMessageId;
  writeWatchParties(data);

  return watchParty;
}

export function deleteWatchParty(messageId: string): void {
  const data = readWatchParties();

  if (!data.watchParties[messageId]) {
    return;
  }

  delete data.watchParties[messageId];

  writeWatchParties(data);
}

export function findActiveWatchPartyByMedia(
  mediaType: WatchContentType,
  mediaId: string,
): WatchParty | null {
  const data = readWatchParties();

  return (
    Object.values(data.watchParties).find((watchParty) => {
      return (
        watchParty.mediaType === mediaType &&
        watchParty.mediaId === mediaId &&
        watchParty.status === WATCH_CONSTANTS.ACTIVE_STATUS
      );
    }) ?? null
  );
}

export function findActiveWatchPartiesByGuildId(guildId: string): WatchParty[] {
  const data = readWatchParties();

  return Object.values(data.watchParties).filter((watchParty) => {
    return (
      watchParty.guildId === guildId &&
      watchParty.status === WATCH_CONSTANTS.ACTIVE_STATUS
    );
  });
}

export function userHasAnotherActiveWatchParty(
  guildId: string,
  userId: string,
  excludedMessageId?: string,
): boolean {
  const data = readWatchParties();

  return Object.entries(data.watchParties).some(([messageId, watchParty]) => {
    if (excludedMessageId && messageId === excludedMessageId) {
      return false;
    }

    return (
      watchParty.guildId === guildId &&
      watchParty.status === WATCH_CONSTANTS.ACTIVE_STATUS &&
      watchParty.users.includes(userId)
    );
  });
}

export function addUserToWatchParty(messageId: string, userId: string): WatchParty | null {
  const data = readWatchParties();
  const watchParty = data.watchParties[messageId];

  if (!watchParty) {
    return null;
  }

  if (!watchParty.users.includes(userId)) {
    watchParty.users.push(userId);
    writeWatchParties(data);
  }

  return watchParty;
}

export function removeUserFromWatchParty(messageId: string, userId: string): WatchParty | null {
  const data = readWatchParties();
  const watchParty = data.watchParties[messageId];

  if (!watchParty) {
    return null;
  }

  watchParty.users = watchParty.users.filter((id) => id !== userId);
  writeWatchParties(data);

  return watchParty;
}
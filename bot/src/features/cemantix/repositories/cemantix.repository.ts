import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../../core/db/client.js";
import {
  cemantixGames as cemantixGamesTable,
  cemantixTopGuesses as cemantixTopGuessesTable,
} from "../../../core/db/schema.js";
import type { CemantixGame, CemantixTopGuess } from "../domain/cemantix.types.js";
import { CEMANTIX_CONSTANTS } from "../domain/cemantix.constants.js";

// ---------------------------------------------------------------------------
// Games
// ---------------------------------------------------------------------------

export async function findCemantixGame(date: string): Promise<CemantixGame | null> {
  const [row] = await db
    .select()
    .from(cemantixGamesTable)
    .where(eq(cemantixGamesTable.date, date));

  if (!row) {
    return null;
  }

  return {
    date: row.date,
    secretWord: row.secretWord,
    isSolved: row.isSolved,
    winnerId: row.winnerId,
    winnerName: row.winnerName,
    announcementMessageId: row.announcementMessageId,
    rankingMessageId: row.rankingMessageId,
    startedAt: row.startedAt,
    solvedAt: row.solvedAt,
  };
}

export async function saveCemantixGame(game: CemantixGame): Promise<void> {
  await db
    .insert(cemantixGamesTable)
    .values(game)
    .onConflictDoUpdate({
      target: cemantixGamesTable.date,
      set: {
        secretWord: game.secretWord,
        isSolved: game.isSolved,
        winnerId: game.winnerId,
        winnerName: game.winnerName,
        announcementMessageId: game.announcementMessageId,
        rankingMessageId: game.rankingMessageId,
        startedAt: game.startedAt,
        solvedAt: game.solvedAt,
      },
    });
}

export async function markCemantixGameSolved(params: {
  date: string;
  winnerId: string;
  winnerName: string;
  solvedAt: string;
}): Promise<void> {
  await db
    .update(cemantixGamesTable)
    .set({
      isSolved: true,
      winnerId: params.winnerId,
      winnerName: params.winnerName,
      solvedAt: params.solvedAt,
    })
    .where(eq(cemantixGamesTable.date, params.date));
}

export async function updateCemantixAnnouncementMessageId(
  date: string,
  messageId: string,
): Promise<void> {
  await db
    .update(cemantixGamesTable)
    .set({ announcementMessageId: messageId })
    .where(eq(cemantixGamesTable.date, date));
}

export async function updateCemantixRankingMessageId(
  date: string,
  messageId: string,
): Promise<void> {
  await db
    .update(cemantixGamesTable)
    .set({ rankingMessageId: messageId })
    .where(eq(cemantixGamesTable.date, date));
}

export async function deleteCemantixGame(date: string): Promise<void> {
  // Top guesses cascade-delete via FK
  await db
    .delete(cemantixGamesTable)
    .where(eq(cemantixGamesTable.date, date));
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

export type CemantixLeaderboardEntry = {
  userId: string;
  userName: string;
  wins: number;
};

/**
 * Returns the all-time win leaderboard (up to 10 players, most wins first).
 * Only counts games where isSolved = true and winnerId is set.
 */
export async function getCemantixLeaderboard(): Promise<CemantixLeaderboardEntry[]> {
  const rows = await db
    .select({
      userId: cemantixGamesTable.winnerId,
      userName: cemantixGamesTable.winnerName,
      wins: sql<number>`count(*)::integer`,
    })
    .from(cemantixGamesTable)
    .where(eq(cemantixGamesTable.isSolved, true))
    .groupBy(cemantixGamesTable.winnerId, cemantixGamesTable.winnerName)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  return rows.filter(
    (r): r is CemantixLeaderboardEntry => r.userId !== null && r.userName !== null,
  );
}

// ---------------------------------------------------------------------------
// Top guesses
// ---------------------------------------------------------------------------

export async function getCemantixTopGuesses(date: string): Promise<CemantixTopGuess[]> {
  const rows = await db
    .select()
    .from(cemantixTopGuessesTable)
    .where(eq(cemantixTopGuessesTable.gameDate, date))
    .orderBy(desc(cemantixTopGuessesTable.score));

  return rows.map((r) => ({
    gameDate: r.gameDate,
    word: r.word,
    userId: r.userId,
    userName: r.userName,
    score: r.score,
  }));
}

/**
 * Attempts to insert or improve a top-guess entry.
 * Returns the updated top-guess list and whether the guess entered/improved the top.
 */
export async function upsertCemantixTopGuess(guess: CemantixTopGuess): Promise<{
  topGuesses: CemantixTopGuess[];
  enteredTop: boolean;
}> {
  const current = await getCemantixTopGuesses(guess.gameDate);

  // Word already in top — only update if score improves
  const existingIndex = current.findIndex((g) => g.word === guess.word);

  if (existingIndex !== -1) {
    const existing = current[existingIndex];

    if (guess.score <= existing.score) {
      return { topGuesses: current, enteredTop: false };
    }

    await db
      .update(cemantixTopGuessesTable)
      .set({ score: guess.score, userId: guess.userId, userName: guess.userName })
      .where(
        and(
          eq(cemantixTopGuessesTable.gameDate, guess.gameDate),
          eq(cemantixTopGuessesTable.word, guess.word),
        ),
      );

    const updated = await getCemantixTopGuesses(guess.gameDate);
    const newIndex = updated.findIndex((g) => g.word === guess.word);

    return { topGuesses: updated, enteredTop: newIndex < existingIndex };
  }

  // New word — check if there's room or if it beats the last entry
  if (current.length < CEMANTIX_CONSTANTS.TOP_GUESSES_COUNT) {
    await db.insert(cemantixTopGuessesTable).values(guess);
    const updated = await getCemantixTopGuesses(guess.gameDate);
    return { topGuesses: updated, enteredTop: true };
  }

  const lowest = current[current.length - 1];

  if (guess.score <= lowest.score) {
    return { topGuesses: current, enteredTop: false };
  }

  // Evict the lowest entry and insert the new one
  await db
    .delete(cemantixTopGuessesTable)
    .where(
      and(
        eq(cemantixTopGuessesTable.gameDate, guess.gameDate),
        eq(cemantixTopGuessesTable.word, lowest.word),
      ),
    );

  await db.insert(cemantixTopGuessesTable).values(guess);
  const updated = await getCemantixTopGuesses(guess.gameDate);

  return { topGuesses: updated, enteredTop: true };
}

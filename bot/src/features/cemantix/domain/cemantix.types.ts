export type CemantixGame = {
  date: string; // "YYYY-MM-DD"
  secretWord: string;
  isSolved: boolean;
  winnerId: string | null;
  winnerName: string | null;
  announcementMessageId: string | null;
  rankingMessageId: string | null;
  startedAt: string; // ISO
  solvedAt: string | null; // ISO
};

export type CemantixTopGuess = {
  gameDate: string; // "YYYY-MM-DD"
  word: string;
  userId: string;
  userName: string;
  score: number; // integer 0–100
};

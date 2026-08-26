import { and, eq } from "drizzle-orm";
import { db } from "../../../core/db/client.js";
import { birthdays as birthdaysTable } from "../../../core/db/schema.js";
import type { Birthday } from "../domain/birthday.types.js";

function toBirthday(row: typeof birthdaysTable.$inferSelect): Birthday {
  return {
    userId: row.userId,
    guildId: row.guildId,
    day: row.day,
    month: row.month,
  };
}

export async function upsertBirthday(birthday: Birthday): Promise<void> {
  await db
    .insert(birthdaysTable)
    .values(birthday)
    .onConflictDoUpdate({
      target: birthdaysTable.userId,
      set: {
        guildId: birthday.guildId,
        day: birthday.day,
        month: birthday.month,
      },
    });
}

export async function deleteBirthday(userId: string): Promise<void> {
  await db.delete(birthdaysTable).where(eq(birthdaysTable.userId, userId));
}

export async function findBirthdayByUserId(userId: string): Promise<Birthday | null> {
  const [row] = await db
    .select()
    .from(birthdaysTable)
    .where(eq(birthdaysTable.userId, userId));

  return row ? toBirthday(row) : null;
}

export async function findBirthdaysByDayMonth(day: number, month: number): Promise<Birthday[]> {
  const rows = await db
    .select()
    .from(birthdaysTable)
    .where(and(eq(birthdaysTable.day, day), eq(birthdaysTable.month, month)));

  return rows.map(toBirthday);
}

export async function findBirthdaysByGuild(guildId: string): Promise<Birthday[]> {
  const rows = await db
    .select()
    .from(birthdaysTable)
    .where(eq(birthdaysTable.guildId, guildId));

  return rows.map(toBirthday);
}

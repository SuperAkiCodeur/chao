import { and, eq } from "drizzle-orm";
import { db } from "../../../core/db/client.js";
import { valorantLinks } from "../../../core/db/schema.js";
import type { ValorantLinkedAccount } from "../domain/valorant.types.js";

function toLinkedAccount(
  row: typeof valorantLinks.$inferSelect,
): ValorantLinkedAccount {
  return {
    discordUserId: row.discordUserId,
    guildId: row.guildId,
    riotId: row.riotId,
    puuid: row.puuid,
    region: row.region,
    linkedAt: row.linkedAt,
  };
}

export async function findLinkedAccount(
  discordUserId: string,
  guildId: string,
): Promise<ValorantLinkedAccount | null> {
  const [row] = await db
    .select()
    .from(valorantLinks)
    .where(
      and(
        eq(valorantLinks.discordUserId, discordUserId),
        eq(valorantLinks.guildId, guildId),
      ),
    );

  return row ? toLinkedAccount(row) : null;
}

export async function saveLinkedAccount(
  account: ValorantLinkedAccount,
): Promise<void> {
  await db
    .insert(valorantLinks)
    .values({
      discordUserId: account.discordUserId,
      guildId: account.guildId,
      riotId: account.riotId,
      puuid: account.puuid,
      region: account.region,
      linkedAt: account.linkedAt,
    })
    .onConflictDoUpdate({
      target: [valorantLinks.discordUserId, valorantLinks.guildId],
      set: {
        riotId: account.riotId,
        puuid: account.puuid,
        region: account.region,
        linkedAt: account.linkedAt,
      },
    });
}

export async function findAllLinkedAccountsInGuild(
  guildId: string,
): Promise<ValorantLinkedAccount[]> {
  const rows = await db
    .select()
    .from(valorantLinks)
    .where(eq(valorantLinks.guildId, guildId));

  return rows.map(toLinkedAccount);
}

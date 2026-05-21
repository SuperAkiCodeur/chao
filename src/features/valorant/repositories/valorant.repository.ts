import { and, eq } from "drizzle-orm";
import { db } from "../../../core/db/client.js";
import { valorantLinks, valorantSetupMessages } from "../../../core/db/schema.js";
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

export async function findSetupMessage(
  guildId: string,
): Promise<{ channelId: string; messageId: string } | null> {
  const [row] = await db
    .select()
    .from(valorantSetupMessages)
    .where(eq(valorantSetupMessages.guildId, guildId));

  return row ? { channelId: row.channelId, messageId: row.messageId } : null;
}

export async function saveSetupMessage(
  guildId: string,
  channelId: string,
  messageId: string,
): Promise<void> {
  await db
    .insert(valorantSetupMessages)
    .values({ guildId, channelId, messageId })
    .onConflictDoUpdate({
      target: valorantSetupMessages.guildId,
      set: { channelId, messageId },
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

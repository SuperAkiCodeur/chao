import { db } from "@/lib/db";
import { dealsGames, dealsConfig } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { PageShell } from "@/components/PageShell";
import { DealsClient } from "./DealsClient";
import { DealsCreator } from "./DealsCreator";
import type { DiscordChannel } from "@/components/FeatureSettings";

export const dynamic = "force-dynamic";

const GUILD_ID  = process.env.DISCORD_GUILD_ID!;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

async function getData() {
  const [games, configs] = await Promise.all([
    db.select().from(dealsGames).where(eq(dealsGames.guildId, GUILD_ID)),
    db.select().from(dealsConfig).where(eq(dealsConfig.guildId, GUILD_ID)),
  ]);

  // Grouper par salon
  const byChannel = new Map<string, { games: typeof games; notifChannelId: string | null; listName: string | null }>();
  for (const g of games) {
    if (!byChannel.has(g.channelId)) {
      const cfg = configs.find((c) => c.channelId === g.channelId);
      byChannel.set(g.channelId, { games: [], notifChannelId: cfg?.notifChannelId ?? null, listName: cfg?.name ?? null });
    }
    byChannel.get(g.channelId)!.games.push(g);
  }
  // Ajouter les salons avec config mais sans jeux
  for (const cfg of configs) {
    if (!byChannel.has(cfg.channelId)) {
      byChannel.set(cfg.channelId, { games: [], notifChannelId: cfg.notifChannelId ?? null, listName: cfg.name ?? null });
    }
  }
  return byChannel;
}

async function getChannels(): Promise<DiscordChannel[]> {
  const res = await fetch(
    `https://discord.com/api/v10/guilds/${GUILD_ID}/channels`,
    { headers: { Authorization: `Bot ${BOT_TOKEN}` }, cache: "no-store" },
  );
  return res.ok ? res.json() : [];
}

export default async function DealsPage() {
  const [data, channels] = await Promise.all([getData(), getChannels()]);

  return (
    <PageShell title="Deals" description="Suivi de prix et alertes promotions Steam par salon">

      {[...data.entries()].map(([channelId, { games, notifChannelId, listName }]) => {
        const channel = channels.find((c) => c.id === channelId);
        return (
          <DealsClient
            key={channelId}
            channelId={channelId}
            channelName={channel?.name ?? channelId}
            notifChannelId={notifChannelId}
            listName={listName}
            games={games}
            channels={channels}
          />
        );
      })}

      <DealsCreator channels={channels} usedChannelIds={[...data.keys()]} />

    </PageShell>
  );
}

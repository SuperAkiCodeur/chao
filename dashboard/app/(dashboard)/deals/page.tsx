import { db } from "@/lib/db";
import { dealsLists, dealsListMembers, dealsGames } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { PageShell, SectionCard, StatCard } from "@/components/PageShell";
import { DealsClient } from "./DealsClient";
import type { DiscordChannel } from "@/components/FeatureSettings";

export const dynamic = "force-dynamic";

const GUILD_ID  = process.env.DISCORD_GUILD_ID!;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

async function getData() {
  const lists = await db.select().from(dealsLists).where(eq(dealsLists.guildId, GUILD_ID));

  const enriched = await Promise.all(lists.map(async (list) => {
    const [games, members] = await Promise.all([
      db.select().from(dealsGames).where(eq(dealsGames.listId, list.id)),
      db.select().from(dealsListMembers).where(eq(dealsListMembers.listId, list.id)),
    ]);
    return { ...list, games, members };
  }));

  return enriched;
}

async function getChannels(): Promise<DiscordChannel[]> {
  const res = await fetch(
    `https://discord.com/api/v10/guilds/${GUILD_ID}/channels`,
    { headers: { Authorization: `Bot ${BOT_TOKEN}` }, cache: "no-store" },
  );
  return res.ok ? res.json() : [];
}

export default async function DealsPage() {
  const [lists, channels] = await Promise.all([getData(), getChannels()]);

  const totalGames  = lists.reduce((acc, l) => acc + l.games.length, 0);
  const totalOnSale = lists.reduce((acc, l) => acc + l.games.filter((g) => g.isOnSale === 1).length, 0);

  return (
    <PageShell title="Deals" description="Listes de jeux suivis et alertes promotions Steam">

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        <StatCard value={lists.length}   label="Listes actives" />
        <StatCard value={totalGames}     label="Jeux trackés"   />
        <StatCard value={totalOnSale}    label="En promo"        sub="actuellement" />
      </div>

      {lists.length === 0 ? (
        <SectionCard title="Listes">
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
            Aucune liste créée. Utilise <code>/deals</code> dans Discord pour commencer.
          </p>
        </SectionCard>
      ) : (
        lists.map((list) => (
          <DealsClient key={list.id} list={list} channels={channels} />
        ))
      )}

    </PageShell>
  );
}

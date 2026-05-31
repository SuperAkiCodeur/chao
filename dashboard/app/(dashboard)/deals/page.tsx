import { db } from "@/lib/db";
import { dealsGames, dealsConfig } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { DealsClient } from "./DealsClient";
import type { DiscordChannel, DiscordRole } from "@/components/FeatureSettings";
import { PageShell, StatCard, SectionCard } from "@/components/PageShell";

export const dynamic = "force-dynamic";

const GUILD_ID  = process.env.DISCORD_GUILD_ID!;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

async function getData() {
  const [games, configs] = await Promise.all([
    db.select().from(dealsGames).where(eq(dealsGames.guildId, GUILD_ID)),
    db.select().from(dealsConfig).where(eq(dealsConfig.guildId, GUILD_ID)),
  ]);
  return { games, config: configs[0] ?? { notifChannelId: null, notifRoleId: null } };
}

async function getDiscord() {
  const [chRes, roRes] = await Promise.all([
    fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/channels`, { headers: { Authorization: `Bot ${BOT_TOKEN}` }, cache: "no-store" }),
    fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`,    { headers: { Authorization: `Bot ${BOT_TOKEN}` }, cache: "no-store" }),
  ]);
  const channels: DiscordChannel[] = chRes.ok ? await chRes.json() : [];
  const roles: DiscordRole[]       = roRes.ok ? await roRes.json() : [];
  return { channels, roles };
}

export default async function DealsPage() {
  const [{ games, config }, { channels, roles }] = await Promise.all([getData(), getDiscord()]);
  const onSaleCount = games.filter(g => g.isOnSale === 1).length;

  return (
    <PageShell title="Deals" description="Liste de jeux trackés, comparaison de prix et alertes promotions">

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
        <StatCard value={games.length}  label="Jeux trackés" />
        <StatCard value={onSaleCount}   label="En promo"     sub="actuellement" />
      </div>

      <SectionCard title="Jeux trackés">
        <div>
          <DealsClient games={games} config={config} channels={channels} roles={roles} />
        </div>
      </SectionCard>

    </PageShell>
  );
}

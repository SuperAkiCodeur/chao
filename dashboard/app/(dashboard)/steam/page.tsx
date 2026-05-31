import { db } from "@/lib/db";
import { steamGames, steamConfig } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { SteamClient } from "./SteamClient";
import { CommandsReference } from "@/components/CommandsReference";
import type { DiscordChannel, DiscordRole } from "@/components/FeatureSettings";
import { PageShell, StatCard, SectionCard } from "@/components/PageShell";

export const dynamic = "force-dynamic";

const GUILD_ID  = process.env.DISCORD_GUILD_ID!;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

async function getData() {
  const [games, configs] = await Promise.all([
    db.select().from(steamGames).where(eq(steamGames.guildId, GUILD_ID)),
    db.select().from(steamConfig).where(eq(steamConfig.guildId, GUILD_ID)),
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

export default async function SteamPage() {
  const [{ games, config }, { channels, roles }] = await Promise.all([getData(), getDiscord()]);
  const onSaleCount = games.filter(g => g.isOnSale === 1).length;

  return (
    <PageShell title="Steam" description="Liste de jeux trackés, comparaison de prix et alertes promotions">

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
        <StatCard value={games.length}  label="Jeux trackés" />
        <StatCard value={onSaleCount}   label="En promo"     sub="actuellement" />
      </div>

      <SectionCard title="Jeux trackés">
        <div>
          <SteamClient games={games} config={config} channels={channels} roles={roles} />
        </div>
      </SectionCard>

      <CommandsReference commands={[{
        name: "/steam",
        description: "Ouvre un menu interactif éphémère avec 5 actions : 🔍 Ajouter un jeu, 📋 Voir la liste, 💰 Comparer les prix, 🗑️ Retirer un jeu, 🔥 Voir les promos en cours.",
        note: "La comparaison de prix multi-boutiques nécessite une clé ITAD_API_KEY.",
      }]} />

    </PageShell>
  );
}

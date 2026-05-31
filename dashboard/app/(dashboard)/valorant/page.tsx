import { db } from "@/lib/db";
import { valorantLinks } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { ValorantClient } from "./ValorantClient";
import { FeatureSettings, type DiscordChannel, type DiscordRole } from "@/components/FeatureSettings";
import { ApiAttribution } from "@/components/ApiAttribution";
import { getAllSettings } from "@/lib/settings";
import { PageShell } from "@/components/PageShell";

export const dynamic = "force-dynamic";

const DEFAULT_GUILD_ID = process.env.DISCORD_GUILD_ID ?? "";
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

async function getData() {
  return db.select().from(valorantLinks).orderBy(desc(valorantLinks.linkedAt));
}

async function getChannels(): Promise<DiscordChannel[]> {
  const res = await fetch(`https://discord.com/api/v10/guilds/${DEFAULT_GUILD_ID}/channels`, {
    headers: { Authorization: `Bot ${BOT_TOKEN}` }, cache: "no-store",
  });
  return res.ok ? res.json() : [];
}

export default async function ValorantPage() {
  const [accounts, channels, settings] = await Promise.all([getData(), getChannels(), getAllSettings()]);

  return (
    <PageShell title="Valorant" description="Comptes Riot liés aux membres Discord">

      <ValorantClient accounts={accounts} defaultGuildId={DEFAULT_GUILD_ID} />

      <FeatureSettings channels={channels} roles={[] as DiscordRole[]} settings={settings} noCollapse fields={[
        { key: "valorant_channel_id", label: "Salon Valorant", description: "Salon où le bot poste les résultats", kind: "channel" },
      ]} />

      <ApiAttribution name="HenrikDev API" url="https://henrikdev.xyz/" description="statistiques et résultats Valorant via l'API Riot Games" />

    </PageShell>
  );
}

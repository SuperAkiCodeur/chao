import { db } from "@/lib/db";
import { valorantLinks } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { ValorantClient } from "./ValorantClient";
import { FeatureSettings } from "@/components/FeatureSettings";
import { GUILD_ID, fetchGuildChannels } from "@/lib/discord";
import type { DiscordRole } from "@/lib/discord";
import { ApiAttribution } from "@/components/ApiAttribution";
import { getAllSettings } from "@/lib/settings";
import { PageShell } from "@/components/PageShell";

export const dynamic = "force-dynamic";

async function getData() {
  return db.select().from(valorantLinks).orderBy(desc(valorantLinks.linkedAt));
}

export default async function ValorantPage() {
  const [accounts, channels, settings] = await Promise.all([getData(), fetchGuildChannels(), getAllSettings()]);

  return (
    <PageShell title="Valorant" description="Comptes Riot liés aux membres Discord">

      <ValorantClient accounts={accounts} defaultGuildId={GUILD_ID} />

      <FeatureSettings channels={channels} roles={[] as DiscordRole[]} settings={settings} noCollapse fields={[
        { key: "valorant_channel_id", label: "Salon Valorant", description: "Salon où le bot poste les résultats", kind: "channel" },
      ]} />

      <ApiAttribution name="HenrikDev API" url="https://henrikdev.xyz/" description="statistiques et résultats Valorant via l'API Riot Games" />

    </PageShell>
  );
}
